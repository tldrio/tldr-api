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
  { login: { type: String
           , unique: true
           , required: true
           , validate: [validateLogin, 'login must be a properly formatted email address']
           }
  , name: { type: String
          , validated: [validateName, 'name must have between 1 and 100 characters']
          }
  }
, { strict: true });




// Validators - empty stubs for now
function validateLogin (value) {
  return true;
}

function validateName (value) {
  return true;
}




// Define user model
UserModel = mongoose.model('user', UserSchema);

// Export UserModel
module.exports.UserModel = UserModel;


