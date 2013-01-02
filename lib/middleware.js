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
    req.userRoleAdmin = true;
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
  var returnUrl = req.route.method === 'get' ? req.url : '/';
  if (req.user) {
    return next();
  } else {
    return res.redirect(config.websiteUrl + '/login?returnUrl=' + returnUrl);
  }
}


/**
 * Checks if the client is a logged user. If he is, handle request with ifLogged.
 * If he isn't, handle it with ifNotLogged
 * @param {Object} options The object containing the two function cited above
 * @return {Function} Handler with (req, res, next) signature
 */
function loggedInCheck (options) {
  var optionMissing = function (req, res, next) { return next({ statusCode: 404, body: { message: i18n.resourceNotFound } }); }
    , ifLogged = options.ifLogged || optionMissing
    , ifNotLogged = options.ifNotLogged || optionMissing;

  return function (req, res, next) {
    if (req.user) {
      ifLogged(req, res, next);
    } else {
      ifNotLogged(req, res, next);
    }
  };
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


/**
 * Many website routes need common values like the logged user or the number of notifications
 * They are all calculated here
 * @param {Request} req The request object, passed from the caller function
 * @param {Function} cb The callback
 */
function calculateRenderingValues (req, cb) {
  var values = _.extend({}, config)   // All config variables should be accessible directly in all views
    , notifStatuses
    , user = req.user;

  // Default partials options
  req.renderingPartials = { fbmetatags: '{{>website/metatags/metatagsDefault}}' };

  // if no user dont add anything
  if (!user) {
    req.renderingValues = {};
    return cb();
  }

  // flag is user is admin
  if (req.user.isAdmin()) {
    values.admin = true;
  }

  // if logged used display his infos, notifications
  values.loggedUser = user;
  user.getNotifications(200, function(err, notifs) {
    values.notifications = notifs;

    // Count the unseen notifs
    notifStatuses = _.countBy(values.notifications, function (notif) {
      return notif.unseen ? 'unseen' : 'seen';
    });

    // Get count only if > 0
    if (notifStatuses.unseen) {
      values.unseenNotifications = notifStatuses.unseen;
    }

    req.renderingValues = values;
    return cb();
  });

}


/*
 * Middleware version of the above function
 */
function attachRenderingValues (req, res, next) {
  calculateRenderingValues(req, next);
}


/*
 * Route depending of on the content type (HTML or not)
 */
function contentNegotiationHTML_JSON (routeHTML, routeJSON) {
  return function (req, res, next) {
    if (req.accepts('text/html')) {
      calculateRenderingValues(req, function () {
        routeHTML(req, res, next);
      });
    } else {
      routeJSON(req, res, next);
    }
  };
}




module.exports.adminOnly = adminOnly;
module.exports.attachRenderingValues = attachRenderingValues;
module.exports.CORS = CORS;
module.exports.decorateRequest = decorateRequest;
module.exports.handleErrors = handleErrors;
module.exports.loggedInOnly = loggedInOnly;
module.exports.contentNegotiationHTML_JSON = contentNegotiationHTML_JSON;
module.exports.loggedInCheck = loggedInCheck;
