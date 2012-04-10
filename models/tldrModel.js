/**
 * Model Definition of Database using Mongoose
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */

var mongoose = require('mongoose')
  , crypto = require('crypto')
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
	_id        : String,
	url        : String,
	hostname   : String,
	summary    : String
});


/*
 * Statics and dynamics are defined here
 */

// Returns the fields that are modifiable by user
TldrSchema.statics.userModifiableFields = {url: true, summary: true};


// Creates non-user modifiable parameters. This is missing-parameter proof
TldrSchema.methods.craftInstance = function () {
  var sha1 = crypto.createHash('sha1');

  if (! this.url) { this.url = ""; }

  // _id is the hashed url
  sha1.update(this.url, 'utf8');
  this._id = sha1.digest('hex');

  this.hostname = url.parse(this.url).hostname;
};


TldrSchema.statics.createAndCraftInstance = function(userInput) {
  var inst = new TldrModel(userInput);

  inst.craftInstance();

  return inst;
}


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



// Define tldr model
TldrModel = mongoose.model('tldr', TldrSchema);

// Export TldrModel
module.exports.TldrModel = TldrModel;

