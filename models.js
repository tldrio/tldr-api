/**
 * Model Definition of Database using Mongoose
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */

var TldrModel = require('./models/tldrModel');

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
