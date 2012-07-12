/**
 * Model Definition of Database using Mongoose
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , _ = require('underscore')
  , UserSchema, UserModel
  , bcrypt = require('bcrypt')
  , userSetableFields = ['email', 'username', 'password']      // setable fields by user
  , userUpdatableFields = ['email', 'username', 'password']    // updatabe fields by user
  , authorizedFields = ['email', 'username'];


/**
 * Schema
 *
 */
UserSchema = new Schema(
  { email: { type: String   // Should be the user's email. Not defined as a Mongoose type email to be able to use the same regex on client side easily
           , unique: true
           , required: true
           , validate: [validateLogin, 'email must be a properly formatted email address']
           }
  , username: { type: String
          , required: true
          , validate: [validateName, 'username must have between 1 and 100 characters']
          }
  // The actual password is not stored, only a hash. Still, a Mongoose validator will be used, see createAndSaveInstance
  , password: { type: String
              , required: true
              , validate: [validatePassword, 'password must be at least 6 characters long']
              }
  // No need to store the salt, bcrypt already stores it in the hash
  }
, { strict: true });




/*
 * Create a User instance and save it to the database
 * All defaults are located here instead of in the schema or in setters
 * Part of the password's validation has to occur here as Mongoose's setters are called before the
 * validator, so using the standard way any password would be considered valid
 */
UserSchema.statics.createAndSaveInstance = function (userInput, callback) {
  var validFields = _.pick(userInput, userSetableFields)
    , instance;

  // Password is salted and hashed ONLY IF it is valid. If it is not, then it is left intact, and so will fail validation
  // when Mongoose tries to save it. This way we get a nice and comprehensive errors object.
  // bcrypt is (intentionally) a CPU-heavy function. The load is greatly reduced when used in an async way
  // The '10' parameter to genSalt determines the strength (i.e. the computation time) of bcrypt. 10 is already very secure.
  if (validatePassword(validFields.password)) {
    bcrypt.genSalt(6, function(err, salt) {
      bcrypt.hash(validFields.password, salt, function (err, hash) {
        validFields.password = hash;
        validFields.email = validFields.email.toLowerCase();   // Redundant with the setter, but the setter also works with direct saves so we keep both
        if (! validFields.username || (validFields.username.length === 0) ) {
          validFields.username = validFields.email;
        }
        instance = new UserModel(validFields);
        instance.save(callback);
      });
    });
  } else {
    instance = new UserModel(validFields);
    instance.save(callback);
  }
};


/*
 * Return the part of a user's data that we may need to use in a client
 */
UserSchema.methods.getAuthorizedFields = function () {
  // this is the selected UserModel, so this._doc contains the actual data
  var usableKeys = _.intersection(_.keys(this._doc), authorizedFields)
    , res = {}, self = this;

  _.each( usableKeys, function (key) {
    res[key] = self._doc[key];
  });

  return res;
};


/*
 * Validators
 */
// Email regex comes from node-validator and can be used by clients
function validateLogin (value) {
  if (value) {
    return value.match(/^(?:[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+\.)*[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+@(?:(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!\.)){0,61}[a-zA-Z0-9]?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!$)){0,61}[a-zA-Z0-9]?)|(?:\[(?:(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\.){3}(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\]))$/);
  } else {
    return false;
  }
}


function validateName (value) {
  return (value && value.length <= 40);
}

function validatePassword (value) {
  return (value ? value.length >= 6 : false);
}

UserSchema.statics.validateLogin = validateLogin;
UserSchema.statics.validateName = validateName;
UserSchema.statics.validatePassword = validatePassword;

// Define user model
UserModel = mongoose.model('user', UserSchema);

// Export UserModel
module.exports = UserModel;

