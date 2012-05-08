// Place to put our custom errors and error messages

var restify = require('restify')
  , util = require('util');

// Raised if someone tries to create a new tldr with Object ID (i.e. hash of URL) already taken
function TldrAlreadyExistsError(message) {
  restify.RestError.call(this, 409, 'TldrAlreadyExistsError', message, TldrAlreadyExistsError);
  this.name = 'TldrAlreadyExistsError';
}

util.inherits(TldrAlreadyExistsError, restify.RestError);


module.exports.TldrAlreadyExistsError = TldrAlreadyExistsError;
