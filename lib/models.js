/**
 * Model Definition of Database using Mongoose
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 */

var Tldr = require('../models/tldrModel')
  , User = require('../models/userModel').User
  , DeletedUsersData = require('../models/userModel').DeletedUsersData
  , Credentials = require('../models/credentialsModel')
  , TldrHistory = require('../models/tldrHistoryModel')
  , UserHistory = require('../models/userHistoryModel')
  , Topic = require('../models/topic.js')
  , _ = require('underscore')
  , config = require('../lib/config')
  , i18n = require('../lib/i18n')
  , Post = require('../models/postModel')
  , Thread = require('../models/threadModel')
  , APIClient = require('../models/apiClientModel')
  , Event = require('../models/analytics').Event
  , TldrAnalytics = require('../models/analytics').TldrAnalytics
  , UserAnalytics = require('../models/analytics').UserAnalytics
  , EmbedAnalytics = require('../models/analytics').EmbedAnalytics
  , RSSAnalytics = require('../models/analytics').RSSAnalytics
  , TwitterAnalytics = require('../models/analytics').TwitterAnalytics
  , TldrSubscription = require('../models/subscriptionTldr')
  ;



/**
 * Given the "errors" object of an exception thrown by Mongoose's validation system,
 * return an object with all non validated fields and an explanatory message for each
 *
 * @param {Object} errorsObject object thrown by Mongoose
 * @return {Object} result object that contains the incriminated fields
 */
function getAllValidationErrorsWithExplanations(errorsObject) {
  var result = {};

  _.each(errorsObject, function (value, key) {
    result[key] = value.type;
  });

  return result;
}



/**
 * Given a mongo 11000 or 11001 error, returns the duplicate field.
 * Unfortunately, Mongo is such that if two fields are conflicting, we will only see the conflict for one of them (which we return)
 *
 * @param {Object} error the raw error returned by Mongo and passed by Mongoose
 * @return {Object} the duplicate field name
 */
function getDuplicateField(error) {
  var beg = error.err.indexOf('.$')
    , end = error.err.indexOf('_');

  // Check that this is indeed a duplicate error
  if (error.code !== 11000 && error.code !== 11001 ) {
    throw {message: i18n.failureGetDuplicateError};
  }

  // If we can't find the field name. Note that since indexOf returns the first matching substring, end is the index of the first matching
  // "_". There shouldn't be any before the fieldname and there may be some after but the first one has to be the delimiter
  if (beg === -1 || end === -1 || end <= beg || beg + 2 >= error.err.length) {
    return "unknown";
  }

  // Return the field name
  return error.err.substring(beg + 2, end);
}



// Export models
module.exports.Topic = Topic;
module.exports.Tldr = Tldr;
module.exports.TldrHistory = TldrHistory;
module.exports.Credentials = Credentials;
module.exports.User = User;
module.exports.DeletedUsersData = DeletedUsersData;
module.exports.UserHistory = UserHistory;
module.exports.Post = Post;
module.exports.Thread = Thread;
module.exports.APIClient = APIClient;
module.exports.Event = Event;
module.exports.TldrAnalytics = TldrAnalytics;
module.exports.UserAnalytics = UserAnalytics;
module.exports.EmbedAnalytics = EmbedAnalytics;
module.exports.RSSAnalytics = RSSAnalytics;
module.exports.TwitterAnalytics = TwitterAnalytics;
module.exports.TldrSubscription = TldrSubscription;

// Export general purpose functions for models
module.exports.getDuplicateField = getDuplicateField;
module.exports.getAllValidationErrorsWithExplanations = getAllValidationErrorsWithExplanations;
