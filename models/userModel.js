/**
 * Model Definition of Database using Mongoose
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId
  , _ = require('underscore')
  , UserSchema, User
  , bcrypt = require('bcrypt')
  , userSetableFields = ['email', 'username', 'password']      // setable fields by user
  , userUpdatableFields = ['username']                // updatabe fields by user (password not included here as it is a special case)
  , authorizedFields = ['email', 'username'];         // fields that can be sent to the user


/**
 * Schema
 *
 */
UserSchema = new Schema(
  { email: { type: String   // Should be the user's email. Not defined as a Mongoose type email to be able to use the same regex on client side easily
           , unique: true
           , required: true
           , validate: [validateEmail, 'email must be a properly formatted email address']
           }
  , username: { type: String
          , required: true
          , validate: [validateUsername, 'username must have between 1 and 30 characters']
          }
  // The actual password is not stored, only a hash. Still, a Mongoose validator will be used, see createAndSaveInstance
  // No need to store the salt, bcrypt already stores it in the hash
  , password: { type: String
              , required: true
              , validate: [validatePassword, 'password must be at least 6 characters long']
              }
  , tldrsCreated: [{type: ObjectId, ref: 'tldr'}]   // See mongoose doc - populate
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
        if (!validFields.username || (validFields.username.length === 0) ) {
          validFields.username = validFields.email;
        }
        instance = new User(validFields);
        instance.save(callback);
      });
    });
  } else {
    instance = new User(validFields);
    instance.save(callback);
  }
};


/*
 * Return the part of a user's data that we may need to use in a client
 */
UserSchema.methods.getAuthorizedFields = function () {
  // this is the selected User, so this._doc contains the actual data
  var usableKeys = _.intersection(_.keys(this._doc), authorizedFields)
    , res = {}, self = this;

  _.each( usableKeys, function (key) {
    res[key] = self._doc[key];
  });

  return res;
};


/*
 * Update a user password
 * @param {String} currentPassword supplied by user for checking purposes
 * @param {String} newPassword chosen by user
 */
UserSchema.methods.updatePassword = function (currentPassword, newPassword, callback) {
  var self = this
    , errors = {};

  if (! currentPassword || ! newPassword) {throw {message: "Missing argument currentPassword or newPassword"};}

  if (! validatePassword(newPassword)) { errors.newPassword = "New password must be at least 6 characters long" }

  bcrypt.compare(currentPassword, self.password, function(err, valid) {
    if (err) {throw err;}

    if (valid) {
      if ( ! errors.newPassword) {
        // currentPassword is correct and newPassword is valid: we can change
        bcrypt.genSalt(6, function(err, salt) {
          bcrypt.hash(newPassword, salt, function (err, hash) {
            self.password = hash;
            self.save(callback);
          });
        });
        return;  // Stop executing here to avoid calling the callback twice
      }
    } else {
      errors.currentPassword = "You didn't supply the correct current password";
    }

    callback(errors);
  });
}


/*
 * Update a user profile (only updates the user updatable fields, and not the password)
 */
UserSchema.methods.updateValidFields = function (data, callback) {
  var self = this
    , validUpdateFields = _.intersection(_.keys(data), userUpdatableFields);

  _.each(validUpdateFields, function(field) {
    self[field] = data[field];
  });

  self.save(callback);
}


/*
 * Get all tldrs created by the user
 *
 * @param {Function} callback function to be called with the results after having fetched the tldrs
 */
UserSchema.methods.getCreatedTldrs = function(callback) {
  User.findOne({"_id": this._id})
    .populate('tldrsCreated')
    .exec(function(err, user) {
      if (err) {throw err;}
      callback(user.tldrsCreated);
    });
}



/*
 * Validators
 */
// Email regex comes from node-validator and can be used by clients
function validateEmail (value) {
  if (value) {
    // returns null in case of no match, hence the if/else
    return value.match(/^(?:[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+\.)*[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+@(?:(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!\.)){0,61}[a-zA-Z0-9]?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!$)){0,61}[a-zA-Z0-9]?)|(?:\[(?:(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\.){3}(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\]))$/);
  } else {
    return false;
  }
}

// Username should be non empty and less than 30 characters long
function validateUsername (value) {
  return (value && value.length <= 30 && value.length >= 1);
}

// password should be non empty and longer than 6 characters
function validatePassword (value) {
  return (value ? value.length >= 6 : false);
}

UserSchema.statics.validateEmail = validateEmail;
UserSchema.statics.validateUsername = validateUsername;
UserSchema.statics.validatePassword = validatePassword;

// Define user model
User = mongoose.model('user', UserSchema);

// Export User
module.exports = User;

