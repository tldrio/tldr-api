/**
 * Definition of the Credentials collection
 * Can be any type of credentials: basic login/password, Google OpenID etc.
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */


var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId
  , CredentialsSchema, Credentials
  , _ = require('underscore')
  , i18n = require('../lib/i18n')
  , bcrypt = require('bcrypt')
  , check = require('validator').check
  , crypto = require('crypto')
  , config = require('../lib/config')
  , customUtils = require('../lib/customUtils')
  ;


/**
 * Validators
 *
 */
// password should be non empty and longer than 6 characters
function validatePassword (value) {
  try {
    check(value).len(6);
    return true;
  } catch(e) {
    return false;
  }
}


/**
 * Schema definition
 *
 */
CredentialsSchema = new Schema({
  type: { type: String   // One of 'basic', 'google'. We may add more later
        , required: true
        }
, login: { type: String
         , index: { unique: true, sparse: true }
         }
, password: { type: String
            , validate: [validatePassword, i18n.validateUserPwd]
            }
});


/**
 * Create a new 'basic' Credentials, with a login (the user's email) and a
 * password to be bcrypt-ed
 * @param {Object} data login, password
 * @param {Function} cb Optional callback, signature: err, Credentials
 */
CredentialsSchema.statics.createBasicCredentials = function (data, cb) {
  var callback = cb || function () {}
    , instance;

  data.type = 'basic';
  instance = new Credentials(data)

  instance.validate(function (err) {
    if (err) { return callback(err); }

    bcrypt.genSalt(config.bcryptRounds, function(err, salt) {
      bcrypt.hash(data.password, salt, function (err, hash) {
        instance.password = hash;
        instance.save(callback);
      });
    });
  });
};


// Define and export Credentials model
Credentials = mongoose.model('credentials', CredentialsSchema);
module.exports = Credentials;
