/**
 * Model Definition of Database using Mongoose
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */

var TldrModelDefinition = require('./models/tldrModel');

// Given the "errors" object of an exception thrown by Mongoose's validation system,
// return an array of non validated fields
function getAllValidationErrors(errorsObject) {
	if (!errorsObject)
		return null;

	var result = [], prop;

	for (prop in errorsObject) {
		if (errorsObject.hasOwnProperty(prop)) {
			result.push(prop);
		}
	}

	return result;
}

// Given the "errors" object of an exception thrown by Mongoose's validation system,
// return a JSON with all non validated fields and an explanatory message for each
function getAllValidationErrorsInNiceJSON(errorsObject) {
	var result = {}, prop;

	for (prop in errorsObject) {
		if (errorsObject.hasOwnProperty(prop)) {
			result[prop] = errorsObject[prop].type;
		}
	}

	return result;
}


// From a schema definition object, return the path names
// Useful to safely update objects from user input
function returnPathsFromPathsDefinition(pathsObject) {
  var prop
    , result = {};

  for (prop in pathsObject) {
    if (pathsObject.hasOwnProperty(prop)) {
      result[prop] = true;
    }
  }

  return result;
}


// Export models
module.exports.TldrModel = TldrModelDefinition.TldrModel;

// Export general purpose functions for models
module.exports.getAllValidationErrors = getAllValidationErrors;
module.exports.getAllValidationErrorsInNiceJSON = getAllValidationErrorsInNiceJSON;
