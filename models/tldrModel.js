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
  , userSetableFields = ['_id','summary','title', 'resourceAuthor', 'resourceDate'] // setable fields by user
  , userUpdatableFields = ['summary', 'title', 'resourceAuthor', 'resourceDate'];// updatabe fields by user



/**
 * Schema
 *
 */

TldrSchema = new Schema({
  _id             : { type: String, required: true, validate: [validateUrl, 'url must be a correctly formatted url, with protocol and hostname'] }, // url
  title           : { type: String, required: true, validate: [validateTitle, 'Title has to be non empty and less than 150 characters'] },
  summary         : { type: String, required: true },
  resourceAuthor  : { type: String, required: true, validate: [validateAuthor, 'resourceAuthor has to be non empty and less than 50 characters long'] },
  resourceDate    : { type: Date,   required: true, },
  createdAt       : { type: Date,   required: true, default: Date.now },
  updatedAt       : { type: Date,   required: true, default: Date.now }
}, 
{ strict: true });



/**
 * Create a new instance of TldrModel and populate it without persisting it.
 * Only fields in userSetableFields are handled
 * @param {String} _id  The decoded URL which serves as id for the tldr in db
 * @param {JSObject} userInput Object containing the fields to set for the tldr instance
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
 * Update tldr object with the provided hash.
 * Only fields in userUpdatableFields are handled
 * @param {JSObject} updates Object containing fields to update with corresponding value
 *
 */

TldrSchema.methods.updateValidFields = function (updates, callback) {
  var validUpdateFields = _.intersection(_.keys(updates), userUpdatableFields)
    , self = this;

  _.each( validUpdateFields, function (validField) {
    self[validField] = updates[validField];
  });

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
 * Middlewares
 *
 */

TldrSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});




/**
 * Validators
 *
 */

//_id should be a url, containing hostname and protocol info 
function  validateUrl (value) {
  var valid;

  valid = (value !== undefined);
  if (valid) {
    // Check if Url is valid with Regex
    return value.match(/^(?:(?:ht|f)tp(?:s?)\:\/\/|~\/|\/)?(?:\w+:\w+@)?(localhost|(?:(?:[-\w\d{1-3}]+\.)+(?:com|org|net|gov|mil|biz|info|mobi|name|aero|jobs|edu|co\.uk|ac\.uk|it|fr|tv|museum|asia|local|travel|[a-z]{2}))|((\b25[0-5]\b|\b[2][0-4][0-9]\b|\b[0-1]?[0-9]?[0-9]\b)(\.(\b25[0-5]\b|\b[2][0-4][0-9]\b|\b[0-1]?[0-9]?[0-9]\b)){3}))(?::[\d]{1,5})?(?:(?:(?:\/(?:[-\w~!$+|.,="'\(\)_\*]|%[a-f\d]{2})+)+|\/)+|\?|#)?(?:(?:\?(?:[-\w~!$+|.,*:]|%[a-f\d{2}])+=?(?:[-\w~!$+|.,*:=]|%[a-f\d]{2})*)(?:&(?:[-\w~!$+|.,*:]|%[a-f\d{2}])+=?(?:[-\w~!$+|.,*:=]|%[a-f\d]{2})*)*)*(?:#(?:[-\w~!$ |\/.,*:;=]|%[a-f\d]{2})*)?$/i) || value.length > 2083;
  }
  return valid;
}

//Summaries should be defined, non empty and not be too long
function summary_validateLength (value) {
  return ((value !== undefined) && (value.length >= 1) && (value.length <= 1500));
}

//Titles should be defined, non empty and not be too long
function validateTitle (value) {
  return ((value !== undefined) && (value.length >= 1) && (value.length <= 150));
}

// Resource Author should be defined, not empty and not be too long
function validateAuthor (value) {
  return ((value !== undefined) && (value.length >= 1) && (value.length <= 50));
}





/**
 * Validators mappings
 *
 */


TldrSchema.path('summary').validate(summary_validateLength, 'summary has to be non empty and less than 1500 characters long');




// Define tldr model
TldrModel = mongoose.model('tldr', TldrSchema);

// Export TldrModel
module.exports.TldrModel = TldrModel;

