// Place to put our custom errors and error messages

var restify = require('restify')
  , util = require('util');

// Raised if someone tries to create a new tldr with Object ID (i.e. hash of URL) already taken
function TldrAlreadyExistsError(message) {
  restify.RestError.call(this, 423, 'TldrAlreadyExistsError', message, TldrAlreadyExistsError);
  this.name = 'TldrAlreadyExistsError';
}

util.inherits(TldrAlreadyExistsError, restify.RestError);


// Raised when someone tries to create an object and an argument is missing
function MissingArgumentError(message, missingArguments) {
  this.message = message;
  this.missingArguments = missingArguments;
}


module.exports.TldrAlreadyExistsError = TldrAlreadyExistsError;
module.exports.MissingArgumentError = MissingArgumentError;
