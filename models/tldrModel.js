/**
 * Model Definition of Database using Mongoose
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */

var mongoose = require('mongoose')
  , crypto = require('crypto')
  , url = require('url')
  , Schema = mongoose.Schema
	, TldrSchema
  , TldrModel
  , customErrors = require('../lib/errors');

	


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

//_id should be a 40 charachters string
function idValidate (value) {
  return value.length === 40;
}

//Url length should be less than 256
function idValidate (value) {
  return value.length <= 256;
}

//Summaries should not be too long
function summaryValidate (value) {
  return value.length <= 1500;
}

TldrSchema.path('_id').validate(idValidate);
TldrSchema.path('url').validate(idValidate);
TldrSchema.path('summary').validate(summaryValidate);

TldrSchema.path('_id').required(true);
TldrSchema.path('url').required(true);
TldrSchema.path('summary').required(true);
TldrSchema.path('hostname').required(true);




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
 * @param {Object} params contains all parameters for object creation (use of Object for forward compatibility)
 * @return {TldrModel} a new TldrModel instance is created and returned
 *
 */

function createTldr (params) {
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




// Export TldrModel
module.exports.Model = TldrModel;
module.exports.createTldr = createTldr;


