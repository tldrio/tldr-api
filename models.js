/**
 * Model Definition of Database using Mongoose
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */

var TldrModelDefinition = require('./models/tldrModel')
	, _ = require('underscore');


// Given the "errors" object of an exception thrown by Mongoose's validation system,
// return a JSON with all non validated fields and an explanatory message for each
function getAllValidationErrorsWithExplanations(errorsObject) {
	var result = {}
		, prop;

	for (prop in errorsObject) {
		if (_.has(errorsObject, prop)) {
			result[prop] = errorsObject[prop].type;
		}
	}

	return result;
}



// Returns an object with only the fields of userInput that are user-modifiable
// Can be used with any model defined with a userModifiableFields, with the use of call()
function acceptableUserInput(userInput) {
  var result = {}
    , prop;

  for (prop in userInput) {
    if (this.userModifiableFields[prop]) {
      result[prop] = userInput[prop];
    }
  }

  return result;
}



// Export models
module.exports.TldrModel = TldrModelDefinition.TldrModel;

// Export general purpose functions for models
module.exports.getAllValidationErrorsWithExplanations = getAllValidationErrorsWithExplanations;
module.exports.acceptableUserInput = acceptableUserInput;
