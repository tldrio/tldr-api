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
, owner: { type: ObjectId, ref: 'user' }
, login: { type: String
         , index: { unique: true, sparse: true }
         }
, password: { type: String
            , validate: [validatePassword, i18n.validateUserPwd]
            }
, resetPasswordToken: { type: String }
, resetPasswordTokenExpiration: { type: Date }
});


/**
 * Prepare a 'basic' Credentials object for creation
 *
 */
CredentialsSchema.statics.prepareBasicCredentialsForCreation = function (bcData) {
  bcData.login = bcData.login || '';
  bcData.password = bcData.password || '';
  bcData.type = 'basic';

  return new Credentials(bcData);
};


/**
 * Create a new 'basic' Credentials, with a login (the user's email) and a
 * password to be bcrypt-ed
 * @param {Object} data login, password
 * @param {Function} cb Optional callback, signature: err, Credentials
 */
CredentialsSchema.statics.createBasicCredentials = function (bcData, cb) {
  var callback = cb || function () {}
    , instance = Credentials.prepareBasicCredentialsForCreation(bcData);

  instance.validate(function (err) {
    if (err) { return callback(err); }

    bcrypt.genSalt(config.bcryptRounds, function(err, salt) {
      bcrypt.hash(bcData.password, salt, function (err, hash) {
        instance.password = hash;
        instance.save(callback);
      });
    });
  });
};


/**
 * Update password
 * Requires the current password for security purposes
 */
CredentialsSchema.methods.updatePassword = function (currentPassword, newPassword, callback) {
  var self = this
    , error = {};

  if (! currentPassword || ! newPassword) { return callback({ oldPassword: i18n.oldPwdMismatch }); }
  if (! validatePassword(newPassword)) { return callback({ newPassword: i18n.validateUserPwd }); }

  bcrypt.compare(currentPassword, self.password, function(err, valid) {
    if (err) { return callback(err); }
    if (! valid) { return callback({ oldPassword: i18n.oldPwdMismatch }); }

    bcrypt.genSalt(config.bcryptRounds, function(err, salt) {
      bcrypt.hash(newPassword, salt, function (err, hash) {
        self.password = hash;
        self.save(callback);
      });
    });
  });
};


/**
 * Reset password procedure
 *
 */
CredentialsSchema.methods.createResetPasswordToken = function (callback) {
  var expiration = new Date();
  expiration.setTime(expiration.getTime() + 3600000);   // Token will expire in an hour

  this.resetPasswordToken = customUtils.uid(13);
  this.resetPasswordTokenExpiration = expiration;
  this.save(callback);
}

CredentialsSchema.methods.resetPassword = function (token, newPassword, callback) {
  var self = this;

  if ( token === this.resetPasswordToken && this.resetPasswordTokenExpiration - Date.now() >= 0 ) {
    if (validatePassword(newPassword)) {
      bcrypt.genSalt(config.bcryptRounds, function(err, salt) {
        bcrypt.hash(newPassword, salt, function (err, hash) {
          self.password = hash;
          self.resetPasswordToken = null;   // Token cannot be used twice
          self.resetPasswordTokenExpiration = null;
          self.save(callback);
        });
      });
    } else {
      this.password = newPassword;   // Will fail validation
      this.save(callback);
    }
  } else {
    callback( { tokenInvalidOrExpired: true } );   // No need to give too much information to a potential attacker
  }
}




// Define and export Credentials model
Credentials = mongoose.model('credentials', CredentialsSchema);
module.exports = Credentials;
