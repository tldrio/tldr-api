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
         , set: customUtils.normalizeUrl
         }
  , anonymous: { type: Boolean, default: false }
  , possibleUrls: [{ type: String, unique: true }]   // All urls that correspond to this tldr. Multikey-indexed.
  , originalUrl: { type: String   // Keep the original url in case normalization goes too far
                 , required: true
                 , set: customUtils.sanitizeInput
                 }
  , hostname: { type: String
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
  , readCount: { type: Number, default: 0 }
  , readCountThisWeek: { type: Number, default: 0 }
  , articleWordCount: { type: Number   // Number I made up after a bit of Googling
                      , default: 863
                      , set: customUtils.sanitizeNumber
                      }
  , wordCount: { type: Number, default: 0 }
  , history: { type: ObjectId, ref: 'tldrHistory', required: true }
  , versionDisplayed: { type: Number, default: 0 }   // Holds the current version being displayed. 0 is the most recent
  , distributionChannels: { latestTldrs: { type: Boolean, default: true }
                          , latestTldrsRSSFeed: { type: Boolean, default: false }
                          }
  , moderated: { type: Boolean, default: false }     // Has it been reviewed by a moderator yet?
  , discoverable: { type: Boolean, default: true }     // Has it been reviewed by a moderator yet?
  , thankedBy: [{ type: ObjectId }]
  , topics: [{ type: ObjectId, ref: 'topic' }]
  , editors: [{ type: ObjectId, ref: 'user'}]
  }
, { strict: true });



// Keep virtual 'slug' attributes and send it when requested
TldrSchema.virtual('slug').get(function () {
  return customUtils.slugify(this.title);
});


TldrSchema.virtual('lastEditor').get(function () {
  if (this.editors.length) {
    return this.editors[this.editors.length - 1];
  } else {
    return null;
  }
});

TldrSchema.set('toJSON', {
   virtuals: true
});



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
    // Initialize topics
    Topic.getIdsFromCategoryNames(userInput.topics, function (err, topicsIds) {
      instance.history = _history._id;
      instance.creator = creator._id;
      instance.hostname = customUtils.getHostnameFromUrl(instance.url);
      instance.wordCount = customUtils.getWordCount(instance.summaryBullets);
      instance.topics = topicsIds;
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


/**
 * Look for a tldr from within a client (website, extension etc.)
 * Signature for cb: err, tldr
 */
function findOneInternal (selector, cb) {
  var callback = cb || function () {};

  Tldr.findOne(selector)
      .populate('creator', 'deleted username twitterHandle')
      .populate('editors', 'deleted username')
      .populate('topics', 'name')
      .exec(function (err, tldr) {

    if (err) { return callback(err); }

    if (tldr) {
      mqClient.emit('tldr.read', { tldr: tldr });
    }

    callback(null, tldr);
  });
}

TldrSchema.statics.findOneByUrl = function (url, cb) {
  findOneInternal({ possibleUrls: customUtils.normalizeUrl(url) }, cb);
};

TldrSchema.statics.findOneById = function (id, cb) {
  findOneInternal({ _id: id }, cb);
};


/**
 * Find tldrs by their category names
 * @param {String or Array of Strings} categories
 * @param {Integer} options.limit
 * @param {Integer} options.skip
 * @param {String} options.sort '-createdAt' for latest, '-readCount' for most read
 */
TldrSchema.statics.findByCategoryName = function (categories, _options, _callback) {
  Topic.getIdsFromCategoryNames(categories, function (err, topicsIds) {
    if (err) { return _callback(err); }

    Tldr.findByCategoryId(topicsIds, _options, _callback);
  });
};

/**
 * Find tldrs by their category
 * @param {Object} category
 * @param {Integer} options.limit
 * @param {Integer} options.skip
 * @param {String} options.sort '-createdAt' for latest, '-readCount' for most read
 */
TldrSchema.statics.findByCategory = function (category, _options, _callback) {
  Tldr.findByCategoryId([category._id], _options, _callback);
};

/**
 * Find tldrs by category id (faster if we already have the id)
 * @param {Array} ids Array of category ids
 */
TldrSchema.statics.findByCategoryId = function (ids, _options, _callback) {
  var options = typeof _options === 'function' ? {} : _options
    , callback = typeof _options === 'function' ? _options : _callback
    , skip = options.skip || 0
    , limit = options.limit || 0
    , sort = options.sort || '-createdAt'   // Sort default: latest
    ;

    Tldr.find({ topics: { $in: ids } })
        .populate('creator', 'deleted username twitterHandle')
        .populate('editors', 'deleted username')
        .populate('topics', 'name')
        .sort(sort)
        .limit(limit)
        .skip(skip)
        .exec(callback);
};


/**
 * Find n tldrs from every category
 * TODO: Absolutely suboptimal for now
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
        Tldr.findByCategory(categories[i], options, function (err, tldrs) {
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
 * A new redirection/canonicalization was found, register it
 * @param {String} from The url from which the redirection comes
 * @param {String} to The url to which the redirection points
 * @param {Function} cb Optional callback
 */
TldrSchema.statics.registerRedirection = function (from, to, cb) {
  var fromN = customUtils.normalizeUrl(from)
    , toN = customUtils.normalizeUrl(to)
    , callback = cb || function () {}
    ;

  Tldr.findOneByUrl(toN, function (err, tldr) {
    if (err) { return callback(err); }

    if (tldr) {
      tldr.possibleUrls.addToSet(fromN);
      tldr.save(callback);
    }
  });
};


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
 * Update tldr object.
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

  //Update the topics field
  Topic.getIdsFromCategoryNames(updates.topics, function (err, topicsIds) {
    if (updates.topics) { self.topics = topicsIds; }   // Don't remove topics if you didn't want to update them

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
 * Thank the author of the tldr
 * @param {User} thanker User who thanked
 * @param {Function} cb Optional callback. Signature: err, tldr
 */
TldrSchema.methods.thank = function (thanker , cb) {
  var callback = cb ? cb : function () {};

  if (! thanker || ! thanker._id) {
    return callback({ thanker: "required" });
  }

  // The user managed to thank twice -> dont do anything
  if (this.thankedBy.indexOf(thanker._id) !== -1) {
    return callback(null, this);
  }

  this.thankedBy.addToSet(thanker._id);

  this.save(callback);
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



// Define tldr model
Tldr = mongoose.model('tldr', TldrSchema);

// Export Tldr
module.exports = Tldr;
