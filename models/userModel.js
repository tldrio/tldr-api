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
  , userSetableFields = ['login', 'name', 'password']      // setable fields by user
  , userUpdatableFields = ['login', 'name', 'password']    // updatabe fields by user
  , sessionUsableFields = ['login', 'name'];


/**
 * Schema
 *
 */

UserSchema = new Schema(
  { login: { type: String   // Should be the user's email. Not defined as a Mongoose type email to be able to use the same regex on client side easily
           , unique: true
           , required: true
           , validate: [validateLogin, 'login must be a properly formatted email address']
           , set: toLowerCase
           }
  , name: { type: String
          , default: 'Anonymous'
          , validate: [validateName, 'name must have between 1 and 100 characters']
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
 * Setters
 */
function toLowerCase(value) {
  return value.toLowerCase();
}


/*
 * Create a User instance and save it to the database
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
 * Return the part of a user's data that we may need to use in a session. Typically, the password is not part of it.
 */
UserSchema.methods.getSessionUsableFields = function () {
  // this is the selected UserModel, so this._doc contains the actual data
  var sessionUsableKeys = _.intersection(_.keys(this._doc), sessionUsableFields)
    , res = {}, self = this;

  _.each( sessionUsableKeys, function (key) {
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
  return (value.length <= 40);
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


