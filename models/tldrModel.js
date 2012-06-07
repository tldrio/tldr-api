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
 * Clean a given url. Policy:
 *   * Trailing slash is to be left unchanged if a path is specified (no addition or removal). It must be added if there is no path (subdomain only) and it is missing
 *   * Trailing fragment and hash are to be removed (this is typically done by the agent but we need to make sure at server level)
 *   * DNS part is lowercased (for normalization purposes as it is case insensitive), the path is kept as-is (can be case sensitive depending on the OS/server) - node.js does it for us
 *   * Query string is kept (can correspond to different representations of resources like different blog posts)
 *   * Default port (80) is removed, other ports are kept
 *   * URL-decoding non-reserved characters should be handled by clients (browsers do it and they are the main clients)
 *   * Uppercasing url-encoded parts (i.e. '%3a' becomes '%3A' as they are equivalent) is not handled (very rare case) --> TODO log occurences to check if really rare
 *   * Removing dot-segments should be handled by clients (browsers do it and they are the main clients)
 */

TldrSchema.statics.normalizeUrl = function (theUrl) {
  var parsedUrl;
  parsedUrl = url.parse(theUrl);
  return (parsedUrl.protocol ? parsedUrl.protocol.toLowerCase() : '')
    + "//"
    + (parsedUrl.hostname ? parsedUrl.hostname : '')
    + (parsedUrl.port ? (parsedUrl.port !== "80" ? ':' + parsedUrl.port : '') : '')
    + (parsedUrl.path ? parsedUrl.path : '/');
};

/**
 * Convenience instance method that normalizes the url (field _id) of a given
 * the instance on which it is called. Uses the static TldrModel.normalizeUrl.
 */
TldrSchema.methods.normalizeUrl = function() {
  this._id = TldrModel.normalizeUrl(this._id);
}




/**
 * Validators
 *
 */

//_id should be a url, containing hostname and protocol info
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

