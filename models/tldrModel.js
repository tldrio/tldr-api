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
TldrSchema.statics.getUserModifiable = function () {
  return { url: true, summary: true };
}

// Creates non-user modifiable parameters. This is missing-parameter proof
TldrSchema.methods.craftInstance = function () {
  var sha1 = crypto.createHash('sha1');

  if (! this.url) { this.url = ""; }

  // _id is the hashed url
  sha1.update(this.url, 'utf8');
  this._id = sha1.digest('hex');

  this.hostname = url.parse(this.url).hostname;
}

// Create a tldr instance
TldrSchema.statics.createTldr = function (params) {
  var sha1 = crypto.createHash('sha1')
    , htldrId
    , tldr
    , parsedUrl;

  // Crude en not DRY validation for now (for the tests)
  // Use validators here when they are ready
  if (!params) {
    throw new customErrors.MissingArgumentError("params is missing", ["params"]);
  }

  if (!params.url || !params.summary) {
    var missingArguments = [];
    if (!params.url) {missingArguments.push('url');}
    if (!params.summary) {missingArguments.push('summary');}
  
    throw new customErrors.MissingArgumentError("Some arguments are missing, can't create tldr", missingArguments);
  }

  // Compute SHA1 Hash
  sha1.update(params.url, 'utf8');
  // Extract it into a string
  htldrId = sha1.digest('hex');
  //Parse url
  parsedUrl = url.parse(params.url);
  //create TldrModel instance
  tldr = new TldrModel({
    _id         : htldrId,
    url         : params.url,
    hostname    : parsedUrl.hostname,
    summary     : params.summary,
  });

  return tldr;
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

