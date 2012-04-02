// Place to put our custom errors and error messages

var restify = require('restify')
  , util = require('util');

// Raised if someone tries to create a new tldr with Object ID (i.e. hash of URL) already taken
function tldrAlreadyExistsError(message) {
  restify.RestError.call(this, 423, 'tldrAlreadyExistsError', message, tldrAlreadyExistsError);
  this.name = 'tldrAlreadyExistsError';
};
util.inherits(tldrAlreadyExistsError, restify.RestError);

module.exports.tldrAlreadyExistsError = tldrAlreadyExistsError;
