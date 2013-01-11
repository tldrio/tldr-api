/**
 * An API client
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */

var i18n = require('../lib/i18n')
  , mongoose = require('mongoose')
  , customUtils = require('../lib/customUtils')
  , check = require('validator').check
  , Schema = mongoose.Schema
  , ObjectId = mongoose.Schema.ObjectId
  , APIClientSchema, APIClient
  ;


/*
 * Validators
 */
function validateText (value) {
  try {
    check(value).len(3, 20);
    return true;
  } catch(e) {
    return false;
  }
}


/*
 * Schema definition
 */
APIClientSchema = new Schema(
  { name: { type: String
          , validate: [validateText, i18n.validateAPIClientName]
          , set: customUtils.sanitizeInput
          , required: true
          }
  , key: { type: String
         , set: customUtils.sanitizeInput
         , required: true
         }
  , routeUsage: {}   // Will be filled along the way
  , createdAt: { type: Date
               , default: Date.now
               }
  }
, { strict: false });


/**
 * Create a new API client and persist it to the database
 * @param {Object} data Data to initialize the instance
 * @param {Function} cb Optional callback, signature: err, APIClient
 *
 */
APIClientSchema.statics.createAndSaveInstance = function (data, cb) {
  var callback = cb || function () {}
    , instance = new APIClient(data)
    ;

  instance.save(callback);
};


/**
 * Increment the read counter for this route
 * @param {String} Name of the route
 * @param {Function} cb Optional callback, signature: err, numDocsAffected
 *
 */
APIClientSchema.methods.incrementRouteUsage = function (route, cb) {
  var query = { $inc: {}}
    , selector = 'routeUsage.' + route
    , callback = cb || function () {}
    , safe = cb ? true : false
    ;

  query["$inc"][selector] = 1;

  this.update(query, { safe: safe }, cb);
};


// Define the model
APIClient = mongoose.model('apiclient', APIClientSchema);


// Export APIClient
module.exports = APIClient;


