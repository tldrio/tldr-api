/**
 * Model Definition of Database using Mongoose
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */

var mongoose = require('mongoose')
  , crypto = require('crypto')
  , _u = require('underscore')
  , bunyan = require('../lib/logger').bunyan // Audit logger for restify
  , url = require('url')
  , Schema = mongoose.Schema
  , TldrSchema
  , TldrModel
  , customErrors = require('../lib/errors');


/**
 * Schema
 *
 */

// Define tldr schema
TldrSchema = new Schema({
	_id          : String,
	url          : String,
	hostname     : String,
	summary      : String,
  dateCreated  : Date,
  lastUpdated  : Date
});


/*
 * Statics and dynamics are defined here
 */

// Returns the fields that are modifiable by user
TldrSchema.statics.userSetableFields = ['url', 'summary'];
TldrSchema.statics.userUpdatableFields = ['summary'];

//Compute Id from Url
TldrSchema.statics.getIdFromUrl = function (url) {
  var sha1 = crypto.createHash('sha1');
  sha1.update(url, 'utf8');
  return sha1.digest('hex');
};

// Creates non-user modifiable parameters. This is missing-parameter proof
TldrSchema.methods.craftInstance = function () {
  if (! this.url) { this.url = ""; }
  // _id is the hashed url
  this._id = TldrModel.getIdFromUrl(this.url);
  this.hostname = url.parse(this.url).hostname;
};


TldrSchema.statics.createAndCraftInstance = function(userInput) {
  var validFields = _u.pick(userInput, TldrModel.userSetableFields)
    , instance = new TldrModel(validFields);

  instance.craftInstance();
  instance.dateCreated = new Date();
  instance.lastUpdated = new Date();

  return instance;
};



/**
 * Middlewares
 *
 */

TldrSchema.pre('save', function(next) {
  this.lastUpdated = new Date();

  next();
});




/**
 * Validators
 *
 */

//_id should be defined a 40 charachters string
function id_validateLength (value) {
  return ((value !== undefined) && (value.length === 40));
}

//Url shoudl be defined, contain hostname and protocol info 

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

TldrSchema.path('summary').required(true);
TldrSchema.path('summary').validate(summary_validateLength, 'summary has to be non empty and less than 1500 characters long');

TldrSchema.path('hostname').required(true);
TldrSchema.path('hostname').validate(hostname_validatePresenceOfDot, 'hostname must be of the form domain.tld');

TldrSchema.path('dateCreated').required(true);

TldrSchema.path('lastUpdated').required(true);


// Define tldr model
TldrModel = mongoose.model('tldr', TldrSchema);

// Export TldrModel
module.exports.TldrModel = TldrModel;

