/**
 * Model Definition of Database using Mongoose
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */

var mongoose = require('mongoose')
  , crypto = require('crypto')
  , url = require('url')
  , Schema = mongoose.Schema
  , winston = require('./lib/logger.js').winston // Custom logger built with Winston
	, TldrSchema
  , TldrModel;

	
// Define tldr scehma
TldrSchema = new Schema({
	_id        : String,
	url        : String,
	hostname   : String,
	summary    : String,
});


/**
 * Creates a TldrModel instance
 *
 * @param {String} url url of the tldrObject
 * @param {String} summary summary of the tldrObject
 * @return {TldrModel} a new TldrModel instance is created and returned
 *
 */

function createTldr (tldrUrl, tldrSummary) {
  var sha1 = crypto.createHash('sha1')
    , htldrId
    , tldr
    , parsedTldrUrl;

  // Compute SHA1 Hash
  sha1.update(tldrUrl, 'utf8');
  // Extract it into a string
  htldrId = sha1.digest('hex');
  //Parse url
  parsedTldrUrl = url.parse(tldrUrl);
  //create TldrModel instance
  tldr = new TldrModel({
    _id         : htldrId,
    url         : tldrUrl,
    hostname    : parsedTldrUrl.hostname,
    summary     : tldrSummary,
  });

  return tldr;
}

// Define tldr model
TldrModel = mongoose.model('tldr', TldrSchema);


// exports TldrModel
exports.TldrModel = TldrModel;
exports.createTldr = createTldr;
