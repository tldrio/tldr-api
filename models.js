/**
 * Model Definition of Database using Mongoose
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */

var Tldr = require('./models/tldrModel')
  , User = require('./models/userModel')
   _ = require('underscore');


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
 * Given a tldr and a user, set the user as the tldr's creator and add the tldr to the list of the user's created tldrs
 *
 * @param {Object} theTldr tldr that will be assigned a creator
 * @param {Object} creator the tldr creator
 * @param {Function} callback callback to be when all linking is done
 * @return {void}
 */
function setTldrCreator(theTldr, creator, callback) {
  if (! theTldr || ! creator) {throw {message: "Unexpected: arguments are not correct"};}

  theTldr.creator = creator;
  theTldr.save(function(err, tldr) {
    if (err) {throw err;}

    creator.tldrsCreated.push(tldr);
    creator.save(callback);
  });
}


/**
 * Given a mongo 11000 or 11001 error, returns the duplicate field.
 * Unfortunately, Mongo is such that if two fields are conflicting, we will only see the conflict for one of them (which we return)
 * This is fucking ugly but there doesn't seem to be another solution
 *
 * @param {Object} error the raw error returned by Mongo and passed by Mongoose
 * @return {Object} the duplicate field name
 */
function getDuplicateField(error) {
  var beg = error.err.indexOf('.$')
    , end = error.err.indexOf('_');

  // Check that this is indeed a duplicate error
  if (error.code !== 11000 && error.code !== 11001 ) {
    throw {message: 'models.getDuplicateErrorNiceFormat was called on an error that\'s not a duplicate error'};
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
module.exports.Tldr = Tldr;
module.exports.User = User;

// Export general purpose functions for models
module.exports.setTldrCreator = setTldrCreator;
module.exports.getDuplicateField = getDuplicateField;
module.exports.getAllValidationErrorsWithExplanations = getAllValidationErrorsWithExplanations;
