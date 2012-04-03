/**
 * Model Definition of Database using Mongoose
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */

var mongoose = require('mongoose')
  , crypto = require('crypto')
  , url = require('url')
  , Schema = mongoose.Schema
  , winston = require('../lib/logger').winston // Custom logger built with Winston
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
 * Validators
 *
 */

//Check _id is a 40 charachters string
function idValidate (value) {
  return value.length === 40;
}

TldrSchema.path('_id').validate(idValidate);




// Expose Find and Modify Method - This is still in dvp 
// cf https://github.com/LearnBoost/mongoose/issues/633
TldrSchema.statics.findAndModify = function (query, sort, doc, options, callback) {
  return this.collection.findAndModify(query, sort, doc, options, callback);
};

// Define tldr model
TldrModel = mongoose.model('tldr', TldrSchema);



/**
 * Creates a TldrModel instance
 *
 * @param {String} url url of the tldrObject
 * @param {String} summary summary of the tldrObject
 * @return {TldrModel} a new TldrModel instance is created and returned
 *
 */

function createTldr (params) {
  var sha1 = crypto.createHash('sha1')
    , htldrId
    , tldr
    , parsedUrl;

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




// Export TldrModel
module.exports.Model = TldrModel;
module.exports.createInstance = createTldr;


