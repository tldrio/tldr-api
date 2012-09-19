/**
 * Model Definition of Database using Mongoose
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */

var _ = require('underscore')
  , bunyan = require('../lib/logger').bunyan
  , i18n = require('../lib/i18n')
  , mongoose = require('mongoose')
  , customUtils = require('../lib/customUtils')
  , ObjectId = mongoose.Schema.ObjectId
  , Schema = mongoose.Schema
  , TldrSchema
  , Tldr
  , url = require('url')
  , userSetableFields = ['url', 'summaryBullets', 'title', 'resourceAuthor', 'resourceDate']     // setable fields by user
  , userUpdatableFields = ['summaryBullets', 'title', 'resourceAuthor', 'resourceDate']     // updatabe fields by user
  , check = require('validator').check
  , sanitize = require('validator').sanitize
  ;






/**
 * Validators
 *
 */


//url should be a url, containing hostname and protocol info
// This validator is very light and only check that the url uses a Web protocol and the hostname has a TLD
// The real validation will take place with the resolve mechanism
function validateUrl (value) {
  try {
    check(value).isUrl();
    return true;
  } catch(e) {
    return false;
  }
}

//Summary should be an Array, non empty and not be too long
function validateBullets (value) {
  try {
    // Value is an array containing at least on element and maximum 5
    check(value).isArray().len(0,5);
    _.map(value, function (bullet) {
      check(bullet).len(1, 160).notEmpty();
    });
    return true;
  } catch(e) {
    return false;
  }
}

//Titles should be defined, non empty and not be too long
function validateTitle (value) {
  try {
    check(value).len(1, 70);
    return true;
  } catch(e) {
    return false;
  }
}

// Resource Author should be defined and not be too long
function validateAuthor (value) {
  try {
    check(value).len(0, 30);
    return true;
  } catch(e) {
    return false;
  }
}


/**
 * Schema
 *
 */

TldrSchema = new Schema(
  { url: { type: String
         , unique: true
         , required: true
         , validate: [validateUrl, i18n.validateTldrUrl]
         , set: customUtils.normalizeUrl
         }
  , title: { type: String
           , validate: [validateTitle, i18n.validateTldrTitle]
           , set: customUtils.sanitizeInput
           }
  , summaryBullets: { type: Array
                    , required: true
                    , validate: [validateBullets, i18n.validateTldrBullet]
                    , set: customUtils.sanitizeArray
                    }
  , resourceAuthor: { type: String
                    , validate: [validateAuthor, i18n.validateTldrAuthor]
                    , set: customUtils.sanitizeInput
                    }
  , resourceDate: { type: Date }   // No need to sanitize, automatically casted to date which is a number
  , createdAt: { type: Date
               , default: Date.now
               }
  , updatedAt: { type: Date
               , default: Date.now
               }
               , required: false
  , creator: { type: ObjectId, ref: 'user' }   // See mongoose doc - populate
  , contributors: [{ type: ObjectId, ref: 'user' }]   // See mongoose doc - populate
  }
, { strict: true });




/**
 * Create a new instance of Tldr and populate it
 * Only fields in userSetableFields are handled
 * @param {Object} userInput Object containing the fields to set for the tldr instance
 * @param {Function} callback Function to call after the creation of the tldr
 */

TldrSchema.statics.createAndSaveInstance = function (userInput, callback) {
  var validFields = _.pick(userInput, userSetableFields)
    , instance;

  instance = new Tldr(validFields);
  instance.save(callback);
};




/**
 * Update tldr object.
 * Only fields in userUpdatableFields are handled
 * @param {Object} updates Object containing fields to update with corresponding value
 * @param {Function} callback callback to be passed to save method
 *
 */

TldrSchema.methods.updateValidFields = function (updates, user, callback) {
  var validUpdateFields = _.intersection(_.keys(updates), userUpdatableFields)
    , self = this;

  _.each( validUpdateFields, function (validField) {
    self[validField] = updates[validField];
  });

  self.updatedAt = new Date();
  if (user) {
    self.contributors.push(user._id);
  }

  self.save(callback);
};



// Define tldr model
Tldr = mongoose.model('tldr', TldrSchema);

// Export Tldr
module.exports = Tldr;
