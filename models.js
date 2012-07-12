/**
 * Model Definition of Database using Mongoose
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */

var Tldr = require('./models/tldrModel')
  , UserModel = require('./models/userModel')
	, _ = require('underscore');


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


// Export models
module.exports.Tldr = Tldr;
module.exports.UserModel = UserModel;

// Export general purpose functions for models
module.exports.getAllValidationErrorsWithExplanations = getAllValidationErrorsWithExplanations;
