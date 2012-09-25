/**
 * Model Definition of Database using Mongoose
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */

var _ = require('underscore')
  , bunyan = require('../lib/logger').bunyan
  , i18n = require('../lib/i18n')
  , mailer = require('../lib/mailer')
  , mongoose = require('mongoose')
  , customUtils = require('../lib/customUtils')
  , ObjectId = mongoose.Schema.ObjectId
  , Schema = mongoose.Schema
  , TldrSchema
  , Tldr
  , url = require('url')
  , userSetableFields = ['url', 'summaryBullets', 'title', 'resourceAuthor', 'resourceDate']     // setable fields by user
  , userUpdatableFields = ['summaryBullets', 'title', 'resourceAuthor', 'resourceDate']     // updatabe fields by user
  , versionedFields = ['summaryBullets', 'title', 'resourceAuthor', 'resourceDate']
  , check = require('validator').check
  , sanitize = require('validator').sanitize
  , TldrHistory = require('./tldrHistoryModel')
  , async = require('async');
  ;






/**
 * Validators
 *
 */


//url should be a url, containing hostname and protocol info
// This validator is very light and only check that the url uses a Web protocol and the hostname has a TLD
// The real validation will take place with the resolve mechanism
function validateUrl (value) {
  try {
    check(value).isUrl();
    return true;
  } catch(e) {
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
    check(value).len(1, 70);
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
  , title: { type: String
           , validate: [validateTitle, i18n.validateTldrTitle]
           , set: customUtils.sanitizeInput
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
  , createdAt: { type: Date
               , default: Date.now
               }
  , updatedAt: { type: Date
               , default: Date.now
               }
               , required: false
  , creator: { type: ObjectId, ref: 'user', required: true }
  , history: { type: ObjectId, ref: 'tldrHistory', required: true }
  , versionDisplayed: { type: Number, default: 0 }   // Holds the current version being displayed. 0 is the most recent
  }
, { strict: true });




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

  history.saveVersion(instance.serialize(), creator, function (err, _history) {
    instance.history = _history._id;
    instance.creator = creator._id;

    instance.save(function(err, tldr) {
      if (err) { return callback(err); }

      creator.tldrsCreated.push(tldr._id);
      creator.save(function(err, _user) {
        if (err) { throw { message: "Unexpected error in Tldr.createAndSaveInstance: couldnt update creator.tldrsCreated" }; }

        callback(null, tldr);
      });
    });
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

  self.saveVersion( self.serialize(), user, function(err, history) {   // Will create the history if it doesn't exist so as toi avoid validation errors
    // Try to save it
    self.save(callback);
  });
};


/**
 * Save a new version of the tldr's history. This wrapper around TldrHistory.saveVersion
 * is useful since it checks that the history exists and creates it on the fly before saving the version
 * @param {String} data Version data, see TldrHistory.saveVersion
 * @param {String} creator Creator of this version, see TldrHistory.saveVersion
 * @param {Function} cb Optional callback
 */
TldrSchema.methods.saveVersion = function (data, creator, cb) {
  var self = this
    , newHistory;

  if (! self.history) {
    newHistory = new TldrHistory();
    newHistory.saveVersion(data, creator, function (err, _history) {
      self.history = _history;
      self.save(cb);
    });
  } else {
    TldrHistory.findOne({ _id: self.history }, function (err, history) {
     history.saveVersion(data, creator, cb);
    });
  }
}


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
}


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
