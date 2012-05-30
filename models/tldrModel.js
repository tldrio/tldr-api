/**
 * Model Definition of Database using Mongoose
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */

var mongoose = require('mongoose')
  , _ = require('underscore')
  , bunyan = require('../lib/logger').bunyan // Audit logger for restify
  , url = require('url')
  , Schema = mongoose.Schema
  , TldrSchema
  , TldrModel
  , userSetableFields = ['_id', 'summaryBullets', 'title', 'resourceAuthor', 'resourceDate'] // setable fields by user
  , userUpdatableFields = ['summaryBullets', 'title', 'resourceAuthor', 'resourceDate'];// updatabe fields by user



/**
 * Schema
 *
 */

TldrSchema = new Schema(
  { _id             : { type: String, required: true, validate: [validateUrl, 'url must be a correctly formatted url, with protocol and hostname'] } // url
  , title           : { type: String, required: true, validate: [validateTitle, 'Title has to be non empty and less than 150 characters'] }
  , summaryBullets  : { type: Array,  required: true, validate: [validateBullets, 'bullets has to contain at least 1 bullet and each bullet must be less than 500 characters long'] }
  , resourceAuthor  : { type: String, required: true, validate: [validateAuthor, 'resourceAuthor has to be non empty and less than 50 characters long'] }
  , resourceDate    : { type: Date }
  , createdAt       : { type: Date,   default: Date.now }
  , updatedAt       : { type: Date,   default: Date.now }
  }
, { strict: true });



/**
 * Create a new instance of TldrModel and populate it
 * Only fields in userSetableFields are handled
 * @param {String} _id  The decoded URL which serves as id for the tldr in db
 * @param {Object} userInput Object containing the fields to set for the tldr instance
 * @param {Function} callback Function to call after the creation of the tldr
 */

TldrSchema.statics.createAndSaveInstance = function(_id, userInput, callback) {
  var validFields = _.pick(userInput, userSetableFields)
    , instance;

  validFields._id = _id;
  instance = new TldrModel(validFields);
  instance.normalizeUrl();
  instance.resourceAuthor = instance.resourceAuthor || "bilbo the hobbit";
  instance.resourceDate = instance.resourceDate || new Date();
  instance.title = instance.title || instance._id; //If no title was provided use url as title

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



/**
 * Clean url of instance, removing query string and hastag
 *
 */

TldrSchema.methods.normalizeUrl = function () {
  var parsedUrl;
  parsedUrl = url.parse(this._id);
  this._id = parsedUrl.protocol+ '//' + parsedUrl.hostname + parsedUrl.pathname;
  this._id = (parsedUrl.protocol ? parsedUrl.protocol.toLowerCase() : '')
    + "//"
    + (parsedUrl.hostname ? parsedUrl.hostname.toLowerCase().replace(/^www\./, "") : '')  // Convert scheme and host to lower case; remove www. if it exists in hostname
    + (parsedUrl.pathname ? parsedUrl.pathname.replace(/\/\.{1,2}\//g, "/").replace(/\/{2,}/, "/") : // Remove dot-segments; Remove duplicate slashes
        "/" // Add trailing /
      );

  return;
};






/**
 * Validators
 *
 */

//_id should be a url, containing hostname and protocol info 
function  validateUrl (value) {
  var valid = (!_.isUndefined(value));
  if (valid) {
    // Check if Url is valid with Regex
    return value.match(/^(?:(?:ht|f)tp(?:s?)\:\/\/|~\/|\/)?(?:\w+:\w+@)?(localhost|(?:(?:[-\w\d{1-3}]+\.)+(?:com|org|net|gov|mil|biz|info|mobi|name|aero|jobs|edu|co\.uk|ac\.uk|it|fr|tv|museum|asia|local|travel|[a-z]{2}))|((\b25[0-5]\b|\b[2][0-4][0-9]\b|\b[0-1]?[0-9]?[0-9]\b)(\.(\b25[0-5]\b|\b[2][0-4][0-9]\b|\b[0-1]?[0-9]?[0-9]\b)){3}))(?::[\d]{1,5})?(?:(?:(?:\/(?:[-\w~!$+|.,="'\(\)_\*]|%[a-f\d]{2})+)+|\/)+|\?|#)?(?:(?:\?(?:[-\w~!$+|.,*:]|%[a-f\d{2}])+=?(?:[-\w~!$+|.,*:=]|%[a-f\d]{2})*)(?:&(?:[-\w~!$+|.,*:]|%[a-f\d{2}])+=?(?:[-\w~!$+|.,*:=]|%[a-f\d]{2})*)*)*(?:#(?:[-\w~!$ |\/.,*:;=]|%[a-f\d]{2})*)?$/i) || value.length > 2083;
  }
  return valid;
}

//Summary should be an Array, non empty and not be too long
function validateBullets (value) {

  function validateBulletLength (bullet) {
    return (bullet.length >=1 && bullet.length <=500); // if bullet is non-empty, it shouldn't be too long
  }

  return (_.isArray(value) // first check if it's an array
          && (!_.isEmpty(value) && value.length <= 5) // check size of array
          && _.any(value) // checks that at least one bullet point is non-empty
          && _.reduce(_.map(value, validateBulletLength), function (memo, s) { return (s && memo); }, true)); // use mapreduce to check if bullets are non-empty and not too long
}

//Titles should be defined, non empty and not be too long
function validateTitle (value) {
  return (!_.isUndefined(value) && (value.length >= 1) && (value.length <= 150));
}

// Resource Author should be defined, not empty and not be too long
function validateAuthor (value) {
  return (!_.isUndefined(value) && (value.length >= 1) && (value.length <= 50));
}





// Define tldr model
TldrModel = mongoose.model('tldr', TldrSchema);

// Export TldrModel
module.exports.TldrModel = TldrModel;

