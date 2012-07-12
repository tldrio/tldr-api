/**
 * Model Definition of Database using Mongoose
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */

var Tldr = require('./models/tldrModel')
  , User = require('./models/userModel')
   _ = require('underscore');


/*
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


/*
 * Given a tldr and a user, set the user as the tldr's creator and add the tldr to the list of the user's created tldrs
 *
 * @param {Object} theTldr tldr that will be assigned a creator
 * @param {Object} creator the tldr creator
 * @return {void}
 */
function setTldrCreator(theTldr, creator) {
  if (! theTldr || ! creator) {return;}

  theTldr.creator = creator;
  theTldr.save(function(err, tldr) {
    if (err) {throw err;}

    creator.tldrsCreated.push();
    creator.save();
  });
}



// Export models
module.exports.Tldr = Tldr;
module.exports.User = User;

// Export general purpose functions for models
module.exports.getAllValidationErrorsWithExplanations = getAllValidationErrorsWithExplanations;
