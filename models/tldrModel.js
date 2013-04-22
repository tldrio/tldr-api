/**
 * Model Definition of Database using Mongoose
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */

var _ = require('underscore')
  , bunyan = require('../lib/logger').bunyan
  , i18n = require('../lib/i18n')
  , config = require('../lib/config')
  , mailer = require('../lib/mailer')
  , mqClient = require('../lib/message-queue')
  , mongoose = require('mongoose')
  , urlNormalization = require('../lib/urlNormalization')
  , customUtils = require('../lib/customUtils')
  , ObjectId = mongoose.Schema.ObjectId
  , Schema = mongoose.Schema
  , TldrSchema, Tldr
  , url = require('url')
  , userSetableFields = ['url', 'summaryBullets', 'title', 'resourceAuthor', 'resourceDate', 'imageUrl', 'articleWordCount', 'anonymous']     // setable fields by user
  , userUpdatableFields = ['summaryBullets', 'title', 'resourceAuthor', 'resourceDate']     // updatabe fields by user
  , versionedFields = ['summaryBullets', 'title', 'resourceAuthor', 'resourceDate']
  , check = require('validator').check
  , sanitize = require('validator').sanitize
  , TldrHistory = require('./tldrHistoryModel')
  , Topic = require('./topic')
  , async = require('async')
  , moment = require('moment')
  ;


/**
 * Validators
 *
 */

//url should be a url, containing hostname and protocol info
// This validator is very light and only check that the url uses a Web protocol and the hostname has a TLD
// The real validation will take place with the resolve mechanism
function validateUrl (value) {
  if (value && value.match(/^(http:\/\/|https:\/\/)/)) {
    return true;
  } else {
    return false;
  }
}


//Summary should be an Array, non empty and not be too long
function validateBullets (value) {
  try {
    // Value is an array containing at least on element and maximum 5
    check(value).isArray().len(0,5);
    _.map(value, function (bullet) {
      check(bullet).len(1, 160).notEmpty();
    });
    return true;
  } catch(e) {
    return false;
  }
}

//Titles should be defined, non empty and not be too long
function validateTitle (value) {
  try {
    check(value).len(1, 200);
    return true;
  } catch(e) {
    return false;
  }
}

// Resource Author should be defined and not be too long
function validateAuthor (value) {
  try {
    check(value).len(0, 30);
    return true;
  } catch(e) {
    return false;
  }
}


/**
 * Schema
 *
 */

TldrSchema = new Schema(
  { url: { type: String   // The canonical url
         , unique: true
         , required: true
         , validate: [validateUrl, i18n.validateTldrUrl]
         , set: urlNormalization.normalizeUrl
         }
  , anonymous: { type: Boolean, default: false }
  , possibleUrls: [{ type: String, unique: true }]   // All urls that correspond to this tldr. Multikey-indexed.
  , originalUrl: { type: String   // Keep the original url in case normalization goes too far
                 , required: true
                 , set: customUtils.sanitizeInput
                 }
  , hostname: { type: String }   // Keep this only until migration 20130325_categoriesAndDomains has been run, necessary to delete the hostname field
  , domain: { type: ObjectId
              , ref: 'topic'
              , required: true
              }
  , title: { type: String
           , validate: [validateTitle, i18n.validateTldrTitle]
           , set: customUtils.sanitizeInput
           , required: true
           }
  , summaryBullets: { type: Array
                    , required: true
                    , validate: [validateBullets, i18n.validateTldrBullet]
                    , set: customUtils.sanitizeArray
                    }
  , resourceAuthor: { type: String
                    , validate: [validateAuthor, i18n.validateTldrAuthor]
                    , set: customUtils.sanitizeInput
                    }
  , resourceDate: { type: Date }   // No need to sanitize, automatically casted to date which is a number
  , imageUrl: { type: String
              , set: customUtils.sanitizeInput }
  , createdAt: { type: Date
               , default: Date.now
               }
  , updatedAt: { type: Date
               , default: Date.now
               }
               , required: false
  , creator: { type: ObjectId, ref: 'user', required: true }
  , language: { language: { type: String
                          , default: 'en'
                          }
              , confidence: { type: Number
                            , default: 0
                            }
              }
  , readCount: { type: Number, default: 0 }
  , readCountThisWeek: { type: Number, default: 0 }
  , articleWordCount: { type: Number   // Number I made up after a bit of Googling
                      , default: 863
                      , set: customUtils.sanitizeNumber
                      }
  , wordCount: { type: Number, default: 0 }
  , history: { type: ObjectId, ref: 'tldrHistory', required: true }
  , versionDisplayed: { type: Number, default: 0 }   // Holds the current version being displayed. 0 is the most recent
  , distributionChannels: { latestTldrs: { type: Boolean, default: false }
                          , latestTldrsRSSFeed: { type: Boolean, default: false }
                          }
  , moderated: { type: Boolean, default: false }     // Has it been reviewed by a moderator yet?
  , discoverable: { type: Boolean, default: true }     // Has it been reviewed by a moderator yet?
  , thankedBy: [{ type: ObjectId }]
  , categories: [{ type: ObjectId, ref: 'topic' }]
  , editors: [{ type: ObjectId, ref: 'user'}]
  }
, { strict: true });



// Keep virtual 'slug' attributes and send it when requested
TldrSchema.virtual('slug').get(function () {
  return customUtils.slugify(this.title);
});

// Also keep the permalink to the tldrpage
TldrSchema.virtual('permalink').get(function () {
  return config.websiteUrl + '/tldrs/' + this._id + '/' + this.slug;
});

TldrSchema.virtual('lastEditor').get(function () {
  if (this.editors.length) {
    return this.editors[this.editors.length - 1];
  } else {
    return null;
  }
});

// Virtual time saved attribute
TldrSchema.virtual('timeSaved').get(function () {
  return moment.duration(customUtils.timeToRead(this.articleWordCount), 'hours').humanize();
});

TldrSchema.set('toJSON', {
   virtuals: true
});


// ========================================================================
// Creation, update
// ========================================================================

/**
 * Create a new instance of Tldr and populate it. Only fields in userSetableFields are handled
 * Also sets the creator if we have one and initializes the tldr history
 * @param {Object} userInput Object containing the fields to set for the tldr instance
 * @param {Object} creator Creator of this tldr
 * @param {Function} callback Function to call after the creation of the tldr
 */

TldrSchema.statics.createAndSaveInstance = function (userInput, creator, callback) {
  var validFields = _.pick(userInput, userSetableFields)
    , instance = new Tldr(validFields)
    , history = new TldrHistory();

  instance.originalUrl = validFields.url;
  if (instance.url) { instance.possibleUrls.push(instance.url); }

  // Initialize tldr history and save first version
  history.saveVersion(instance.serialize(), creator, function (err, _history) {
    // Initialize categories
    Topic.getCategoriesFromNames(userInput.categories, function (err, categories) {
      // Make sure domain is present in topic
      Topic.getDomainFromName(customUtils.getHostnameFromUrl(instance.url), function (err, domain) {
        instance.history = _history._id;
        instance.creator = creator._id;
        instance.domain = domain && domain._id;   // Fail-safe
        instance.wordCount = customUtils.getWordCount(instance.summaryBullets);
        instance.categories = _.pluck(categories, '_id');
        instance.save(function(err, tldr) {
          if (err) { return callback(err); }
          mqClient.emit('tldr.created', { tldr: tldr, creator: creator });

          // Put it in the creator's list of created tldrs
          creator.tldrsCreated.push(tldr._id);
          creator.save(function(err, _user) {
            if (err) { throw { message: "Unexpected error in Tldr.createAndSaveInstance: couldnt update creator.tldrsCreated" }; }

            // Save the tldr creation action for this user. Don't fail on error as this is not critical, simply log
            creator.saveAction('tldrCreation', tldr.serialize(), function (err) {
              if (err) { bunyan.warn('Tldr.createAndSaveInstance - saveAction part failed '); }
              callback(null, tldr);
            });
          });
        });
      });
    });
  });
};


/**
 * Update tldr
 * Only fields in userUpdatableFields are handled
 * @param {Object} updates Object containing fields to update with corresponding value
 * @param {Object} user The contributor who updated this tldr
 * @param {Function} callback callback to be passed to save method
 *
 */
TldrSchema.methods.updateValidFields = function (updates, user, callback) {
  var validUpdateFields = _.intersection(_.keys(updates), userUpdatableFields)
    , self = this;

  // First, update the tldr
  _.each( validUpdateFields, function (validField) {
    self[validField] = updates[validField];
  });
  self.wordCount = customUtils.getWordCount(self.summaryBullets);
  self.updatedAt = new Date();
  self.versionDisplayed = 0;   // We will display the newly entered tldr now, so we reset the version

  //Update the categories field
  Topic.getCategoriesFromNames(updates.categories, function (err, categories) {
    if (updates.categories) { self.categories = _.pluck(categories, '_id'); }   // Don't remove categories if you didn't want to update them

    // Try to save it
    self.save(function (err, tldr) {
      if (err) { return callback(err); }   // If successful, we can update the tldr and its creator's history

      // Update both histories
      // Don't return an error if an history couldnt be saved, simply log it
      TldrHistory.findOne({ _id: tldr.history }, function (err, history) {
        history.saveVersion(tldr.serialize(), user, function(err) {
          if (err) { bunyan.warn('Tldr.createAndSaveInstance - saveAction part failed '); }
          user.saveAction('tldrUpdate', tldr.serialize(), function (err) {
            if (err) { bunyan.warn('Tldr.createAndSaveInstance - saveAction part failed '); }

            callback(null, tldr);
          });
        });
      });
    });
  });
};


/**
 * Update tldr by batch
 * @param {Object} batch Array of urls concerned by the update
 * @param {Object} updateQuery Mongo update object
 * @param {Function} cb Optional - Pass a callback if you want to resume flow after
 * @return {void}
 */
TldrSchema.statics.updateBatch = function (batch, updateQuery, cb) {
  var callback = cb || function () {};
  return this.update({ possibleUrls: { $in: batch } }, updateQuery, { multi: true }, callback);
};


/**
 * Renormalize a tldr
 * @param {Boolean} hard Optional. If set to true, make a "hard" renormalization,
 *                       i.e. reinitialize possibleUrls to [ normalizeUrl(originalUrl) ]
 */
TldrSchema.methods.renormalize = function (options, cb) {
  var callback = cb || function () {}
    , possibleUrls = []
    ;

  if (options.hard) {
    this.possibleUrls = [ urlNormalization.normalizeUrl(this.originalUrl) ];
  } else {
    this.possibleUrls.forEach(function (url) {
      possibleUrls.push(urlNormalization.normalizeUrl(url));
    });
    this.possibleUrls = possibleUrls;
  }

  this.save(function (err, tldr) { return callback(err, tldr); });
};


// ========================================================================
// Moderation
// ========================================================================


TldrSchema.statics.updateDistributionChannels = function (id, channels, cb) {
  var callback = cb || function () {}
    , query = {};

  channels = channels || {};
  _.keys(channels).forEach(function (channel) {
    query['distributionChannels.' + channel] = (channels[channel].toString() === 'true') ? true : false;
  });

  this.update({ _id: id }, { $set: query }, { multi: false }, callback);
};


/**
 * Prevent a tldr from being distributed on any channel (but don't mark it as moderated)
 */
TldrSchema.statics.cockblockTldr = function (id, cb) {
  this.updateDistributionChannels(id, { latestTldrs: false, latestTldrsRSSFeed: false }, cb);
};

/**
 * Mark a tldr as moderated, meaning it's an accurate summary of the resource
 * @param {String} id id of the tldr to moderate
 * @param {Function} cb Optional callback, signature is err, numAffected
 */
TldrSchema.statics.moderateTldr = function (id, cb) {
  var callback = cb || function () {};
  this.update({ _id: id }, { $set: { moderated: true } }, { multi: false }, callback);
};


/**
 * Remove a tldr completely, meaning it won't show up in its creator's list of tldr
 */
TldrSchema.statics.removeTldr = function (id, callback) {
	var creator;

	Tldr.findOne({ _id: id })
      .populate('creator')
      .exec(function (err, tldr) {
		if (err) { return callback(err); }
		if (!tldr) { return callback('Tldr not found'); }
    creator = tldr.creator;

		tldr.remove(function (err) {
			if (err) { return callback(err); }

			creator.tldrsCreated = _.filter(creator.tldrsCreated, function (tid) { return tid.toString() !== id.toString(); });
			creator.save(callback);
		});
	});
};


/**
 * Delete a tldr if it hasn't been edited by someone else or moderated
 * If it was, then make it anonymous
 * @param {User} user The user requesting the deletion
 * @param {Function} cb Optional, signature: err, message telling what happened
 */
TldrSchema.methods.deleteIfPossible = function (user, cb) {
  var callback = cb || function () {};

  if (!user || user._id.toString() !== this.getCreatorId().toString()) {
    return callback(i18n.unauthorized);
  }

  // Not yet moderated and not edited except by its creator
  if (!this.moderated && (!this.editors || this.editors.length === 0 || (this.editors.length === 1 && this.editors[0].toString() === user._id.toString()))) {
    Tldr.removeTldr(this._id, function (err) {
      if (err) {
        return callback(err);
      } else {
        return callback(null, i18n.tldrWasDeleted);
      }
    });
  } else {
    this.anonymous = true;
    this.save(function (err) {
      if (err) {
        return callback(err);
      } else {
        return callback(null, i18n.tldrWasAnonymized);
      }
    });
  }
};


// ========================================================================
// Finding tldrs
// ========================================================================

/**
 * Extend Mongoose's Query object to define in only one place the tldr fields
 * we always need populated
 */
mongoose.Query.prototype.populateTldrFields = function () {
  return this.populate('creator', 'deleted username twitterHandle')
             .populate('editors', 'deleted username')
             .populate('categories', 'name slug')
             .populate('domain', 'name slug');
};


/**
 * Look for a tldr from within a client (website, extension etc.)
 * Signature for cb: err, tldr
 */
function findOneInternal (selector, cb) {
  var callback = cb || function () {};

  Tldr.findOne(selector)
      .populateTldrFields()
      .exec(function (err, tldr) {

    if (err) { return callback(err); }

    if (tldr) {
      mqClient.emit('tldr.read', { tldr: tldr });
    }

    callback(null, tldr);
  });
}

TldrSchema.statics.findOneByUrl = function (url, cb) {
  findOneInternal({ possibleUrls: urlNormalization.normalizeUrl(url) }, cb);
};

TldrSchema.statics.findOneById = function (id, cb) {
  findOneInternal({ _id: id }, cb);
};

TldrSchema.statics.findByUrlBatch = function (batch, options, callback) {
  this.findByQuery({ possibleUrls: { $in: batch } }, options, callback);
};


/**
 * Register a read for multiple tldrs at once
 */
TldrSchema.statics.incrementReadCountByBatch = function (ids, cb) {
  var callback = cb || function () {};

  this.find({ _id: { $in: ids } }, function (err, tldrs) {
    if (err) { return callback(err); }

    tldrs.forEach(function (tldr) {
      mqClient.emit('tldr.read', { tldr: tldr });
    });

    return callback();
  });
};


/**
 * Find tldrs by their category names
 * @param {String or Array of Strings} categories
 */
TldrSchema.statics.findByCategoryName = function (categories, options, callback) {
  Topic.getCategoriesFromNames(categories, function (err, categories) {
    if (err) { return callback(err); }

    Tldr.findByCategoryId(_.pluck(categories, '_id'), options, callback);
  });
};

/**
 * Find tldrs by category id (faster if we already have the id)
 * @param {Array} ids Array of category ids
 */
TldrSchema.statics.findByCategoryId = function (ids, options, callback) {
  this.findByQuery({ categories: { $in: ids } }, options, callback);
};

/**
 * Find tldrs by domain name
 */
TldrSchema.statics.findByDomainName = function (name, options, callback) {
  Topic.getDomainFromName(name, function (err, domain) {
    if (err) { return callback(err); }

    Tldr.findByQuery({ domain: domain._id }, options, callback);
  });
};

/**
 * Find tldrs by domain id
 */
TldrSchema.statics.findByDomainId = function (id, options, callback) {
  Tldr.findByQuery({ domain: id }, options, callback);
};

/**
 * Find all tldrs
 */
TldrSchema.statics.findAll = function (options, callback) {
  Tldr.findByQuery({}, options, callback);
};

/**
 * Find tldrs
 * @generic
 * @param {Object} options Optional, detailed below.
 * @param {Integer} options.limit
 * @param {Integer} options.skip
 * @param {String} options.sort '-createdAt' for latest, '-readCount' for most read
 */
TldrSchema.statics.findByQuery = function (query, _options, _callback) {
  var options = typeof _options === 'function' ? {} : _options
    , callback = typeof _options === 'function' ? _options : _callback
    , skip = options.skip || 0
    , limit = options.limit || 0
    , sort = options.sort || '-createdAt'   // Sort default: latest
    ;

  Tldr.find(query)
      .populateTldrFields()
      .sort(sort)
      .limit(limit)
      .skip(skip)
      .exec(callback);
};


/**
 * Find n tldrs from every category
 * Absolutely suboptimal for now. If we need to use it, make it acceptable
 * @param {Number} options.limit How many tldr from each category to return
 * @param {String} options.sort Same option as findByCategoryName
 * @param {String} options.sort '-createdAt' for latest, '-readCount' for most read
 */
TldrSchema.statics.findFromEveryCategory = function (options, callback) {
  var res = [], i = 0;

  Topic.getCategories(function(err, categories) {
    async.whilst(
      function () { return i < categories.length; }
    , function (cb) {
        Tldr.findByCategoryId([categories[i]._id], options, function (err, tldrs) {
          var el = {};
          if (err) { return cb(err); }
          el.categoryName = categories[i].name;
          el.tldrs = tldrs;
          res = res.concat(el);
          i += 1;
          return cb();
        });
      }
    , function (err) {
      if (err) { return callback(err); }

      return callback(null, res);
    });
  });
};


/**
 * Get a tldr's public data
 */
TldrSchema.methods.getPublicData = function () {
  var res = {}
    , publicFields = [ '_id'
                     , 'originalUrl'
                     , 'title'
                     , 'moderated'
                     , 'distributionChannels'
                     , 'wordCount'
                     , 'articleWordCount'
                     , 'readCount'
                     , 'language'
                     , 'createdAt'
                     , 'updatedAt'
                     , 'summaryBullets'
                     , 'possibleUrls'
                     , 'anonymous'
                     , 'timeSaved'
                     , 'slug'
                     , 'permalink'
                     , 'domain'
                     , 'categories'
                     , 'imageUrl'
                     , 'thankedBy'
                     ]
    , self = this
    ;

  publicFields.forEach(function (field) {
    if (self[field] !== undefined && self[field] !== null) {
      res[field] = self[field];
    }
  });

  if (!res.anonymous) {
    res.creator = self.creator;
    res.editors = self.editors;
  }

  return res;
};


// ========================================================================
// Tldr history management
// ========================================================================

/**
 * Return a serialized version of the fields to be remembered
 * @return {String} The serialized version of the fields to be remembered
 */
TldrSchema.methods.serialize = function () {
  var jsonVersion = {}
    , self = this;

  _.each(versionedFields, function(field) {
    jsonVersion[field] = self[field];
  });

  return JSON.stringify(jsonVersion);
};

/**
 * Takes a serialized object string and returns the corresponding object
 * @param {String} serializedVersion The string
 * @return {Object} The object
 */
TldrSchema.statics.deserialize = function (serializedVersion) {
  return JSON.parse(serializedVersion);
};


/**
 * Switch a tldr back one version
 * @param {Function} callback Optional - to be called after having gone back, with (err, tldr)
 * @return {void}
 */
TldrSchema.methods.goBackOneVersion = function (callback) {
  var self = this
    , versionToGoBack
    , cb = callback ? callback : function () {};

  TldrHistory.findOne({ _id: this.history }, function (err, history) {
    // If we can't go back, simply do nothing
    if (self.versionDisplayed + 1 >= history.versions.length) { return cb(null, self); }

    // Go back one version
    versionToGoBack = Tldr.deserialize(history.versions[self.versionDisplayed + 1].data);
    _.each(_.keys(versionToGoBack), function(key) {
      self[key] = versionToGoBack[key];
    });

    // Update versionDisplayed
    self.versionDisplayed += 1;

    self.save(callback);
  });
};



// ======================================================================
// Misc
// ======================================================================

/**
 * Get the id of this tldr's creator, whether or not the field was populated or not
 * We have a static version for tldrs passed through the node redis pubsub which have lost their methods
 */
TldrSchema.methods.getCreatorId = function () {
  return this.creator._id || this.creator;
};

TldrSchema.statics.getCreatorId = function (tldr) {
  return tldr.creator._id || tldr.creator;
};


/**
 * Thank the author of the tldr
 * @param {User} thanker User who thanked
 * @param {Function} cb Optional callback. Signature: err, tldr, silent
 */
TldrSchema.methods.thank = function (thanker , cb) {
  var callback = cb ? cb : function () {};

  if (! thanker || ! thanker._id) {
    return callback({ thanker: "required" });
  }

  // The user managed to thank twice -> dont do anything. Return cb with 3rd arg to true
  if (this.thankedBy.indexOf(thanker._id) !== -1) {
    return callback(null, this, true);
  }

  this.thankedBy.addToSet(thanker._id);

  this.save(function (err, tldr) { return callback(err, tldr, false); });
};


/**
 * Serialize the tldr in a string that can be put in a data attribute, so that a client can
 * recreate the object (in fact only a subset of its fields)
 */
TldrSchema.methods.serializeForDataAttribute = function () {
  var tldrData;

  tldrData = this.toJSON();
  tldrData = _.pick(tldrData, [ 'title'
                              , '_id'
                              , 'url'
                              , 'summaryBullets'
                              , 'slug'
                              , 'originalUrl'
                              , 'thankedBy'
                              ]);
  tldrData = JSON.stringify(tldrData);
  tldrData = tldrData.replace(/"/g, '\\"');

  return tldrData;
};


// Define tldr model
Tldr = mongoose.model('tldr', TldrSchema);

// Export Tldr
module.exports = Tldr;
