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
  , RedisQueue = require('../lib/redis-queue'), rqClient = new RedisQueue(config.redisQueue)
  , mongoose = require('mongoose')
  , customUtils = require('../lib/customUtils')
  , ObjectId = mongoose.Schema.ObjectId
  , Schema = mongoose.Schema
  , TldrSchema
  , Tldr
  , url = require('url')
  , userSetableFields = ['url', 'summaryBullets', 'title', 'resourceAuthor', 'resourceDate', 'imageUrl']     // setable fields by user
  , userUpdatableFields = ['summaryBullets', 'title', 'resourceAuthor', 'resourceDate']     // updatabe fields by user
  , versionedFields = ['summaryBullets', 'title', 'resourceAuthor', 'resourceDate']
  , check = require('validator').check
  , sanitize = require('validator').sanitize
  , TldrHistory = require('./tldrHistoryModel')
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
  { url: { type: String
         , unique: true
         , required: true
         , validate: [validateUrl, i18n.validateTldrUrl]
         , set: customUtils.normalizeUrl
         }
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
  , readCount: { type: Number, default: 1 }
  , history: { type: ObjectId, ref: 'tldrHistory', required: true }
  , versionDisplayed: { type: Number, default: 0 }   // Holds the current version being displayed. 0 is the most recent
  , discoverable: { type: Boolean   // A tldr is discoverable if a user can stumble upon it on tldr.io, for example on the /tldrs page
                  , default: true   // Undiscoverable means it still exists (e.g. the BM can show it), but we don't show it actively on the website
                  }
  , moderated: { type: Boolean, default: false }   // Has the tldr been accepted by a moderator? For now this doesn't 'freeze' the tldr but it could be the case in the future
  }
, { strict: true });

// Keep a virtual 'slug' attribute and send it when requested
TldrSchema.virtual('slug').get(function () {
  return customUtils.slugify(this.title);
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

  // Initialize tldr history and save first version
  history.saveVersion(instance.serialize(), creator, function (err, _history) {
    instance.history = _history._id;
    instance.creator = creator._id;
    instance.hostname = customUtils.getHostnameFromUrl(instance.url);
    instance.save(function(err, tldr) {
      if (err) { return callback(err); }

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
  return this.update({ url: { $in: batch } }, updateQuery, { multi: true }, callback);
};


/**
 * Make the tldr undiscoverable
 * @param {String} id id of the tldr to make undiscoverable
 * @param {Function} cb Optional callback, signature is err, numAffected
 */
TldrSchema.statics.makeUndiscoverable = function (id, cb) {
  var callback = cb || function () {};
  this.update({ _id: id }, { $set: { discoverable: false } }, { multi: false }, callback);
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
 * Find a tldr with query obj. Increment readcount
 * @param {Object} selector Selector for Query
 * @param {Object} user User who made the request
 * @param {Function} cb - Callback to execute after find. Signature function(err, tldr)
 * @return {void}
 */
TldrSchema.statics.findAndIncrementReadCount = function (selector, user, callback) {

  var query = Tldr.findOneAndUpdate(selector, { $inc: { readCount: 1 } })
                  .populate('creator', 'username twitterHandle');
  // If the user has the admin role, populate history
  if (user && user.isAdmin) {
    query.populate('history');
  }

  query.exec( function (err, tldr) {
    if (!err && tldr) {
      // Send Notif
      rqClient.emit('tldr.read', { from: user
                                 , tldr: tldr
                                 // all contributors instead of creator only ?? we keep creator for now as there a very few edits
                                 , to: tldr.creator
                                 });
    }
    callback(err,tldr);
  });

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
  self.updatedAt = new Date();
  self.versionDisplayed = 0;   // We will display the newly entered tldr now, so we reset the version

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
