/**
 * Model Definition of Database using Mongoose
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */

var TldrModel = require('./models/tldrModel');

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


// Export TldrModel
module.exports.TldrModel = TldrModel.Model;
module.exports.getAllValidationErrors = getAllValidationErrors;
module.exports.getAllValidationErrorsInNiceJSON = getAllValidationErrorsInNiceJSON;
