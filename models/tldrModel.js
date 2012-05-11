/**
 * Model Definition of Database using Mongoose
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */

var mongoose = require('mongoose')
  , crypto = require('crypto')
  , _ = require('underscore')
  , bunyan = require('../lib/logger').bunyan // Audit logger for restify
  , url = require('url')
  , Schema = mongoose.Schema
  , TldrSchema
  , TldrModel
  , userSetableFields = ['url', 'summary','title', 'resourceAuthor'] // setable fields by user
  , userUpdatableFields = ['summary', 'title', 'resourceAuthor'];// updatabe fields by user



/**
 * Schema
 *
 */

// Define tldr schema
TldrSchema = new Schema({
	_id             : String,
	url             : String,
	title           : String,
	hostname        : String,
	summary         : String,
  resourceAuthor  : String,
  createdAt       : Date,
  updatedAt       : Date
});




/**
 * Statics and dynamics are defined here
 */




/**
 * Get the array of fields a user can set when creating a tldr
 * @return {Array} Array of setable fields by user
 */

TldrSchema.statics.getUserSetableFields = function () {
  return userSetableFields;
};


/**
 * Get the array of fields a user can update when creating a tldr
 * @return {Array} Array of updatable fields by user
 */

TldrSchema.statics.getUserUpdatableFields = function () {
  return userUpdatableFields;
};




/**
 * Compute Id (Hash) from Url with the current choice of hash function
 * @param {String} url Url to get hashed
 * @return {String} Id associated with the given url
 */

TldrSchema.statics.computeIdFromUrl = function (url) {
  var sha1 = crypto.createHash('sha1');
  sha1.update(url, 'utf8');
  return sha1.digest('hex');
};





/**
 * Create a new TldrInstance and craft all the nececessary.
 * Only fields in userSetableFields are handled
 * @param {JSObject} userInput Object containing the fields to set for the tldr instance
 *
 */

TldrSchema.statics.createInstance = function(userInput) {
  var validFields = _.pick(userInput, userSetableFields)
    , instance = new TldrModel(validFields);

  if (!instance.url) { instance.url = 'http://nonexistingdomain.com'; }
  
  instance.cleanUrl();
  // _id is the hashed url
  instance._id = TldrModel.computeIdFromUrl(instance.url);
  instance.hostname = url.parse(instance.url).hostname;
  instance.createdAt = new Date();
  instance.updatedAt = new Date();
  //If no title was provided use url as title
  instance.title = instance.title || instance.url;

  return instance;
};






/**
 * Update tldr object with the provided hash.
 * Only fields in userUpdatableFields are handled
 * @param {JSObject} updates Object containing fields to update with corresponding value
 *
 */

TldrSchema.methods.update = function (updates) {
  var validUpdateFields = _.intersection(_.keys(updates), userUpdatableFields)
    , self = this;

  _.each( validUpdateFields, function (validField) {
    self[validField] = updates[validField];
  });

};



/**
 * Clean url of instance, removing query string and hastag
 * 
 */

TldrSchema.methods.cleanUrl = function () {
  var partsUrl;

  partsUrl = url.parse(this.url);
  this.url = partsUrl.protocol+ '//' + partsUrl.hostname + partsUrl.pathname;

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

//_id should be a 40 charachters string
function id_validateLength (value) {
  return ((value !== undefined) && (value.length === 40));
}

//Url should be defined, contain hostname and protocol info 
function url_validatePresenceOfProtocolAndHostname (value) {
  var parsedUrl
    , hostname
    , protocol
    , valid;

  valid = (value !== undefined);
  if (valid) {
    parsedUrl = url.parse(value);
    hostname = parsedUrl.hostname;
    protocol = parsedUrl.protocol;
    valid = valid && (hostname !== undefined);
    valid = valid && (protocol !== undefined);
  }
  return valid;
}

//Summaries should be defined, non empty and not be too long
function summary_validateLength (value) {
  return ((value !== undefined) && (value.length >= 1) && (value.length <= 1500));
}

//Titles should be defined, non empty and not be too long
function title_validateLength (value) {
  return ((value !== undefined) && (value.length >= 1) && (value.length <= 150));
}

//Hostname should be defined and contain at least one .
function hostname_validatePresenceOfDot (value) {
  return ((value !== undefined) && (value.split('.').length >= 2));
}





/**
 * Validators mappings
 *
 */

TldrSchema.path('_id').required(true);
TldrSchema.path('_id').validate(id_validateLength, '[Internal error] please report to contact@needforair.com');  // Should never happen

TldrSchema.path('url').required(true);
TldrSchema.path('url').validate(url_validatePresenceOfProtocolAndHostname, 'url must be a correctly formatted url, with protocol and hostname');

TldrSchema.path('title').required(true);
TldrSchema.path('title').validate(title_validateLength, 'Title has to be non empty and less than 150 characters');

TldrSchema.path('summary').required(true);
TldrSchema.path('summary').validate(summary_validateLength, 'summary has to be non empty and less than 1500 characters long');

TldrSchema.path('hostname').required(true);
TldrSchema.path('hostname').validate(hostname_validatePresenceOfDot, 'hostname must be of the form domain.tld');

TldrSchema.path('createdAt').required(true);

TldrSchema.path('updatedAt').required(true);


// Define tldr model
TldrModel = mongoose.model('tldr', TldrSchema);

// Export TldrModel
module.exports.TldrModel = TldrModel;

