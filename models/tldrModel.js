/**
 * Model Definition of Database using Mongoose
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */

var mongoose = require('mongoose')
  , _ = require('underscore')
  , bunyan = require('../lib/logger').bunyan
  , url = require('url')
  , i18n = require('../lib/i18n')
  , normalizeUrl = require('../lib/customUtils').normalizeUrl
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId
  , TldrSchema
  , Tldr
  , userSetableFields = ['url', 'summaryBullets', 'title', 'resourceAuthor', 'resourceDate']     // setable fields by user
  , userUpdatableFields = ['summaryBullets', 'title', 'resourceAuthor', 'resourceDate'];     // updatabe fields by user




/**
 * Validators
 *
 */

//url should be a url, containing hostname and protocol info
// This validator is very light and only check that the url uses a Web protocol and the hostname has a TLD
// The real validation will take place with the resolve mechanism
function  validateUrl (value) {
  var isDefined = (!_.isUndefined(value))
    , parsedUrl;

  if (isDefined) {
    parsedUrl = url.parse(value);

    return (parsedUrl.protocol !== "") && ((parsedUrl.protocol === "http") || (parsedUrl.protocol === "https") || (parsedUrl.protocol === "http:") || (parsedUrl.protocol === "https:")) &&
           (parsedUrl.hostname !== "") && (parsedUrl.hostname.indexOf(".") !== -1) &&
           (parsedUrl.pathname !== "");
  }

  return false;
}

//Summary should be an Array, non empty and not be too long
function validateBullets (value) {

  function validateBulletLength (bullet) {
    return (bullet.length >=1 && bullet.length <=150); // if bullet is non-empty, it shouldn't be too long
  }

  return (_.isArray(value) && // first check if it's an array
          (!_.isEmpty(value) && value.length <= 5) &&// check size of array
          _.any(value) && // checks that at least one bullet point is non-empty
          _.reduce(_.map(value, validateBulletLength), function (memo, s) { return (s && memo); }, true)); // use mapreduce to check if bullets are non-empty and not too long
}

//Titles should be defined, non empty and not be too long
function validateTitle (value) {
  return (!_.isUndefined(value) && (value.length >= 1) && (value.length <= 50));
}

// Resource Author should be defined and not be too long
function validateAuthor (value) {
  return (!_.isUndefined(value) && (value.length <= 20));
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
         , set: normalizeUrl
         }
  , title: { type: String
           , validate: [validateTitle, i18n.validateTldrTitle]
           }
  , summaryBullets: { type: Array
                    , required: true
                    , validate: [validateBullets, i18n.validateTldrBullet]
                    }
  , resourceAuthor: { type: String
                    , validate: [validateAuthor, i18n.validateTldrAuthor]
                    }
  , resourceDate: { type: Date }
  , createdAt: { type: Date
               , default: Date.now
               }
  , updatedAt: { type: Date
               , default: Date.now
               }
               , required: false
  , creator: { type: ObjectId, ref: 'user' }   // See mongoose doc - populate
  }
, { strict: true });




/**
 * Create a new instance of Tldr and populate it
 * Only fields in userSetableFields are handled
 * @param {Object} userInput Object containing the fields to set for the tldr instance
 * @param {Function} callback Function to call after the creation of the tldr
 */

TldrSchema.statics.createAndSaveInstance = function (userInput, callback) {
  var validFields = _.pick(userInput, userSetableFields)
    , instance;

  instance = new Tldr(validFields);
  instance.save(callback);
};




/**
 * Update tldr object.
 * Only fields in userUpdatableFields are handled
 * @param {Object} updates Object containing fields to update with corresponding value
 * @param {Function} callback callback to be passed to save method
 *
 */

TldrSchema.methods.updateValidFields = function (updates, callback) {
  var validUpdateFields = _.intersection(_.keys(updates), userUpdatableFields)
    , self = this;

  _.each( validUpdateFields, function (validField) {
    self[validField] = updates[validField];
  });

  self.updatedAt = new Date();

  self.save(callback);
};



// Define tldr model
Tldr = mongoose.model('tldr', TldrSchema);

// Export Tldr
module.exports = Tldr;
