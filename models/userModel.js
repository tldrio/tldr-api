/**
 * Model Definition of Database using Mongoose
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , _ = require('underscore')
  , UserSchema, UserModel
  , uuid = require('node-uuid')
  , userSetableFields = ['login', 'name', 'password'] // setable fields by user
  , userUpdatableFields = ['login', 'name', 'password'];// updatabe fields by user


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
          , default: ''
          , validate: [validateName, 'name must have between 1 and 100 characters']
          }
  , password: { type: String
              , required: true
              , validate: [validatePassword, 'password must be at least 6 characters long']
              }
  , salt: { type: String
          , validate: [validateSalt, 'salt must be a 128 bits long uuid']
          }
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
  if (validatePassword(validFields.password)) {
    // Salt is a 128 bits long client-unique string
    validFields.salt = uuid.v4();

  }

  instance = new UserModel(validFields);
  instance.save(callback);
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

// TODO: real validator and update tests
function validateSalt (value) {
  return true;
}


// Define user model
UserModel = mongoose.model('user', UserSchema);

// Export UserModel
module.exports = UserModel;


