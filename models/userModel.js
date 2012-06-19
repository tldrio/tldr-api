/**
 * Model Definition of Database using Mongoose
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , UserSchema, UserModel;


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
          , validated: [validateName, 'name must have between 1 and 100 characters']
          }
  , password: { type: String
              , required: true
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
 * Validators
 */
function validateLogin (value) {
  if (value) {
    return value.match(/^(?:[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+\.)*[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+@(?:(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!\.)){0,61}[a-zA-Z0-9]?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!$)){0,61}[a-zA-Z0-9]?)|(?:\[(?:(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\.){3}(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\]))$/);
  } else {
    return false;
  }
}

function validateName (value) {
  return true;
}




// Define user model
UserModel = mongoose.model('user', UserSchema);

// Export UserModel
module.exports = UserModel;


