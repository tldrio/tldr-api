/**
 * Model Definition of Database using Mongoose
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId
  , _ = require('underscore')
  , i18n = require('../lib/i18n')
  , UserSchema, User
  , bcrypt = require('bcrypt')
  , config = require('../lib/config')
  , customUtils = require('../lib/customUtils')
  , Tldr = require('./tldrModel')
  , userSetableFields = ['email', 'username', 'password']      // setable fields by user
  , check = require('validator').check
  , userUpdatableFields = ['username', 'email']                // updatabe fields by user (password not included here as it is a special case)
  , authorizedFields = ['email', 'username', 'confirmedEmail', '_id'];         // fields that can be sent to the user




/*
 * Validators
 */

// Email regex comes from node-validator and can be used by clients
function validateEmail (value) {
  try {
    check(value).isEmail();
    return true;
  } catch(e) {
    return false;
  }
}

// Username should contain from 3 to 16 alphanumerical characters
function validateUsername (value) {
  try {
    check(value).is(/^[A-Za-z0-9_]{3,16}$/);
    return true;
  } catch(e) {
    return false;
  }
}

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
 * Statics and Methods
 *
 */

function createConfirmToken (callback) {
  var newToken = customUtils.uid(13);

  User.findOne({ email: this.email }, function (err, doc) {

    doc.confirmEmailToken = newToken;
    doc.save(callback);
  });
}


/*
 * Prepare to reset password by creating a reset password token and sending it to the user
 */
function createResetPasswordToken (callback) {
  var expiration = new Date();

  expiration.setTime(expiration.getTime() + 3600000);   // Token will expire in an hour

  this.resetPasswordToken = customUtils.uid(13);
  this.resetPasswordTokenExpiration = expiration;
  this.save(callback);
}


/*
 * Reset password if token is corrected and not expired
 */
function resetPassword (token, newPassword, callback) {
  var self = this;

  if ( token === this.resetPasswordToken && this.resetPasswordTokenExpiration - Date.now() >= 0 ) {
    if (validatePassword(newPassword)) {
      // Token and password are valid
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
    callback( {tokenInvalidOrExpired: true} );   // No need to give too much information to a potential attacker
  }
}


/*
 * Return the part of a user's data that we may need to use in a client
 */
function getAuthorizedFields() {
  // this is the selected User, so this._doc contains the actual data
  var usableKeys = _.intersection(_.keys(this._doc), authorizedFields)
    , res = {}, self = this;

  _.each( usableKeys, function (key) {
    res[key] = self._doc[key];
  });

  return res;
}


/*
 * Get all tldrs created by the user
 *
 * @param {Function} callback function to be called with the results after having fetched the tldrs
 */
function getCreatedTldrs (callback) {
  Tldr.find({'creator': this._id})
    .sort('url',1 )
    .populate('creator', 'username')
    .exec(function(err, docs) {
      if (err) {throw err;}
      callback(docs);
    });
}


/*
 * Update lastActive field
 */
function updateLastActive (callback) {
  this.lastActive = new Date ();
  this.save(function () {
    callback();
  });
}

/*
 * Update a user profile (only updates the user updatable fields, and not the password)
 */
function updateValidFields (data, callback) {
  var self = this
    , validUpdateFields = _.intersection(_.keys(data), userUpdatableFields);

  // user wants to change it's email so we update the confirm status
  // and generate new validation code
  if (self.email !== data.email) {
    self.confirmEmailToken = customUtils.uid(13);
    self.confirmedEmail = false;
  }

  // Manually set usernameLowerCased in case of updates
  if (self.username !== data.username) {
    self.usernameLowerCased = data.username.toLowerCase();
  }

  _.each(validUpdateFields, function(field) {
    self[field] = data[field];
  });
  self.updatedAt = new Date();

  self.save(callback);
}


/*
 * Create a User instance and save it to the database
 * All defaults are located here instead of in the schema or in setters
 * Part of the password's validation has to occur here as Mongoose's setters are called before the
 * validator, so using the standard way any password would be considered valid
 */
function createAndSaveInstance(userInput, callback) {
  var validFields = _.pick(userInput, userSetableFields)
    , instance;

  // Password is salted and hashed ONLY IF it is valid. If it is not, then it is left intact, and so will fail validation
  // when Mongoose tries to save it. This way we get a nice and comprehensive errors object.
  // bcrypt is (intentionally) a CPU-heavy function. The load is greatly reduced when used in an async way
  // The bcryptRounds parameter to genSalt determines the strength (i.e. the computation time) of bcrypt. 10 is already very secure.
  if (validatePassword(validFields.password)) {
    bcrypt.genSalt(config.bcryptRounds, function(err, salt) {
      bcrypt.hash(validFields.password, salt, function (err, hash) {
        validFields.password = hash;
        // Set confirmEmailToken - length 13 is very important
        validFields.confirmedEmail = false;
        validFields.confirmEmailToken = customUtils.uid(13);
        // Set usernameLowerCased
        validFields.usernameLowerCased = validFields.username.toLowerCase();
        instance = new User(validFields);
        instance.save(callback);
      });
    });
  } else {
    // Set required path with valid data
    // So the only validation error that will be
    // triggered is the one for the password
    validFields.username = 'nfadeploy';
    validFields.usernameLowerCased = 'nfadeploy';
    instance = new User(validFields);
    instance.save(callback);
  }
}


/*
 * Update a user password
 * @param {String} currentPassword supplied by user for checking purposes
 * @param {String} newPassword chosen by user
 */
function updatePassword (currentPassword, newPassword, callback) {
  var self = this
    , errors = {};

  if (! currentPassword || ! newPassword) { throw { message: i18n.missingArgUpdatePwd}; }

  if (! validatePassword(newPassword)) { errors.newPassword = i18n.validateUserPwd; }

  bcrypt.compare(currentPassword, self.password, function(err, valid) {
    if (err) {throw err;}

    if (valid) {
      if ( ! errors.newPassword) {
        // currentPassword is correct and newPassword is valid: we can change
        bcrypt.genSalt(config.bcryptRounds, function(err, salt) {
          bcrypt.hash(newPassword, salt, function (err, hash) {
            self.password = hash;
            self.updatedAt = new Date();
            self.save(callback);
          });
        });
        return;  // Stop executing here to avoid calling the callback twice
      }
    } else {
      errors.oldPassword = i18n.oldPwdMismatch;
    }

    callback(errors);
  });
}




/**
 * Schema
 *
 */
UserSchema = new Schema(
  { confirmedEmail: { type: Boolean
                    , default: false
                    }
  , confirmEmailToken: { type: String
                  }
  , createdAt: { type: Date
               , default: Date.now
               }
  , email: { type: String   // Should be the user's email. Not defined as a Mongoose type email to be able to use the same regex on client side easily
           , unique: true
           , required: true
           , validate: [validateEmail, i18n.validateUserEmail]
           , set: customUtils.sanitizeEmail
           }
  , lastActive: { type: Date
                , default: Date.now
                }
  // The actual password is not stored, only a hash. Still, a Mongoose validator will be used, see createAndSaveInstance
  // No need to store the salt, bcrypt already stores it in the hash
  , password: { type: String
              , required: true
              , validate: [validatePassword, i18n.validateUserPwd]
              }
  , tldrsCreated: [{ type: ObjectId, ref: 'tldr' }]   // See mongoose doc - populate
  , username: { type: String
              , required: true
              , validate: [validateUsername, i18n.validateUserName]
              , set: customUtils.sanitizeInput
              }
  , updatedAt: { type: Date
               , default: Date.now
               }
  , usernameLowerCased: { type: String
                        , required: true
                        , unique: true
                        , set: customUtils.sanitizeInput
                        }
  , resetPasswordToken: { type: String }
  , resetPasswordTokenExpiration: { type: Date }
  }
, { strict: true });



/**
 * Bind methods, statics, middleware
 *
 */

UserSchema.methods.getCreatedTldrs = getCreatedTldrs;
UserSchema.methods.getAuthorizedFields = getAuthorizedFields;
UserSchema.methods.createConfirmToken = createConfirmToken;
UserSchema.methods.updateValidFields = updateValidFields;
UserSchema.methods.updatePassword = updatePassword;
UserSchema.methods.updateLastActive = updateLastActive;
UserSchema.methods.createResetPasswordToken = createResetPasswordToken;
UserSchema.methods.resetPassword = resetPassword;

UserSchema.statics.createAndSaveInstance = createAndSaveInstance;
UserSchema.statics.validateEmail = validateEmail;
UserSchema.statics.validateUsername = validateUsername;
UserSchema.statics.validatePassword = validatePassword;


// Define user model
User = mongoose.model('user', UserSchema);

// Export User
module.exports = User;

