/**
 * Model Definition of Database using Mongoose
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */

var TldrModelDefinition = require('./models/tldrModel')
	, _u = require('underscore');


// Given the "errors" object of an exception thrown by Mongoose's validation system,
// return a JSON with all non validated fields and an explanatory message for each
function getAllValidationErrorsWithExplanations(errorsObject) {
	var result = {};

  _u.each(errorsObject, function (value, key) {
    result[key] = value.type;
  });

	return result;
}


// Export models
module.exports.TldrModel = TldrModelDefinition.TldrModel;

// Export general purpose functions for models
module.exports.getAllValidationErrorsWithExplanations = getAllValidationErrorsWithExplanations;
