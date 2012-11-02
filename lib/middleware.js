var bunyan = require('./logger').bunyan
  , config = require('./config')
  , _ = require('underscore')
  , customUtils = require('./customUtils')
  , i18n = require('./i18n');

// Assign a unique ID to the request for logging purposes
// And logs the fact that the request was received
function decorateRequest (req, res, next) {
  var end;

  // Create request id and logs beginning of request with it
  req.requestId = customUtils.uid(8);
  bunyan.customLog('info', req, { message: "New request" });

  // Augment the response end function to log how the request was treated before ending it
  // Technique taken from Connect logger middleware
  // It is important to redefine res.end and not use end directly because in the latter case "this" is not defined
  end = res.end;
  res.end = function(chunk, encoding) {
    res.end = end;
    bunyan.customLog('info', req, {message: "Request end", responseStatus: res.statusCode});
    res.end(chunk, encoding);
  };

  return next();
}


// Add specific headers for CORS
function CORS (req, res, next) {
  // Default value is http, unless req.protocol specifies otherwise
  var protocol = (req.protocol && req.protocol === 'https') ? "https://" : "http://";

  res.header('Access-Control-Allow-Origin', protocol + config.origin );
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
  res.header('Access-Control-Expose-Headers', 'WWW-Authenticate');
  res.header('Access-Control-Allow-Credentials', 'true');   // Necessary header to be able to send the cookie back and forth with the client
  next();
}


// Check if a user is logged and if there is if it is an admin.
// If he is, go on with the request, if not, return an error
function adminOnly (req, res, next) {
  if (req.user && req.user.isAdmin()) {
    return next();
  } else {
    return next({ statusCode: 401, body: { message: i18n.notAnAdmin } });
  }
}

/*
 * Checks if the client is a logged in user. If he is, pass request to next handler
 * If not, redirect to login that will, upon successful login, point to returnUrl.
 * returnUrl is the original url for GET requests, and index for all others
 */
function loggedInOnly (req, res, next) {
  var returnUrl = req.route.method === 'get' ? req.url : '/index';
  if (req.user) {
    return next();
  } else {
    return res.redirect(config.websiteUrl + '/login?returnUrl=' + returnUrl);
  }
}


// Handle All errors coming from next(err) calls
function handleErrors (err, req, res, next) {
  if (err.statusCode && err.body) {
    bunyan.customLog('debug', req, { message: "Validation errors", errors: err.body, responseStatus: err.statusCode });
    return res.json(err.statusCode, err.body);
  } else if (err.message) {
    bunyan.error(err);
    return res.send(500, err.message);
  } else {
    bunyan.error(err);
    return res.send(500, 'Unknown error');
  }
}

function attachRenderingValues (req, res, next) {

  var values = {}
    , notifStatuses
    , user = req.user;

  if (!user) {
    req.renderingValues = {};
    return next();
  }


  values.loggedUser= user;
  user.getNotifications(function(user) {
    values.notifications = user.notifications;

    // Count the unseen notifs
    notifStatuses = _.countBy(values.notifications, function (notif) {
      return notif.unseen ? 'unseen' : 'seen';
    });

    // Get count only if > 0
    if (notifStatuses.unseen) {
      values.unseenNotifications = notifStatuses.unseen;
    }

    req.renderingValues = values;
    return next();
  });

}

module.exports.adminOnly = adminOnly;
module.exports.attachRenderingValues = attachRenderingValues;
module.exports.CORS = CORS;
module.exports.decorateRequest = decorateRequest;
module.exports.handleErrors = handleErrors;
module.exports.loggedInOnly = loggedInOnly;
