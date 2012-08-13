var bunyan = require('./logger').bunyan
  , config = require('./config')
  , customUtils = require('./customUtils');

// Assign a unique ID to the request for logging purposes
// And logs the fact that the request was received
function decorateRequest (req, res, next) {
  var end;

  // Create request id and logs beginning of request with it
  req.requestId = customUtils.uid(8);
  bunyan.customLog('info', req, req.body, "New request");

  // Augment the response end function to log how the request was treated before ending it
  // Technique taken from Connect logger middleware
  end = res.end;
  res.end = function(chunk, encoding) {
    bunyan.customLog('info', req, {message: "Request end", responseStatus: res.statusCode});
    end(chunk, encoding);
  };

  return next();
}


// Add specific headers for CORS
function CORS (req, res, next) {
  res.header('Access-Control-Allow-Origin', config.origin );
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
  res.header('Access-Control-Expose-Headers', 'WWW-Authenticate');
  res.header('Access-Control-Allow-Credentials', 'true');   // Necessary header to be able to send the cookie back and forth with the client
  next();
}

// Handle All errors coming from next(err) calls
function handleErrors (err, req, res, next) {
  if (err.statusCode && err.body) {
    return res.json(err.statusCode, err.body);
  } else if (err.message) {
    bunyan.error(err);
    return res.send(500, err.message);
  } else {
    bunyan.error(err);
    return res.send(500, 'Unknown error');
  }
}

module.exports.CORS = CORS;
module.exports.handleErrors = handleErrors;
module.exports.decorateRequest = decorateRequest;
