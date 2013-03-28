var bunyan = require('./logger').bunyan
  , config = require('./config')
  , _ = require('underscore')
  , customUtils = require('./customUtils')
  , i18n = require('./i18n')
  , h4e = require('h4e')
  , APIClient = require('../models/apiClientModel')
  , geoip = require('geoip-lite')
  , clients = {}   // Cache to store all API clients names
  ;

// Assign a unique ID to the request for logging purposes
// And logs the fact that the request was received
function decorateRequest (req, res, next) {
  var end;

  // Create request id and logs beginning of request with it
  req.requestId = customUtils.uid(8);
  bunyan.customLog('info', req, { message: "New request", 'user-agent': req.headers['user-agent'] });

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
  var protocolMatch
    , requestedHeaders = req.headers['access-control-request-headers']
    , originToAllow
    ;

  if (!req.header('origin')) { return next(); }
  protocolMatch = req.headers.origin.match(/^https?/);
  if (!protocolMatch) { return next(); }
  originToAllow = protocolMatch[0] + '://' + config.origin;

  // If This is an API call from a registered client, allow CORS with him
  // OPTIONS request
  if (requestedHeaders) {
    requestedHeaders = requestedHeaders.split(',');
    if (requestedHeaders.indexOf('api-client-name') && requestedHeaders.indexOf('api-client-key')) {
      originToAllow = req.headers.origin;
    }
  }
  // GET request
  if (req.headers['api-client-name'] && req.headers['api-client-key']) {
    originToAllow = req.headers.origin;
  }

  res.header('Access-Control-Allow-Origin', originToAllow );
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, api-client-name, api-client-key');
  res.header('Access-Control-Expose-Headers', 'WWW-Authenticate');
  res.header('Access-Control-Allow-Credentials', 'true');   // Necessary header to be able to send the cookie back and forth with the client
  next();
}


// Check if a user is logged and if there is if it is an admin.
// If he is, go on with the request, if not, return an error
function adminOnly (req, res, next) {
  if (req.user && req.user.isAdmin) {
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
    return res.redirect('/login?returnUrl=' + returnUrl);
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

  // Default meta properties, including open graph
  values.pageMetaProperties = [];
  values.pageMetaProperties.push({ key: 'og:title', value: 'tl;dr'});
  values.pageMetaProperties.push({ key: 'og:type', value: 'website'});
  values.pageMetaProperties.push({ key: 'og:url', value: 'http://tldr.io'});
  values.pageMetaProperties.push({ key: 'og:image', value: 'http://tldr.io/assets/img/fbicon.png'});
  values.pageMetaProperties.push({ key: 'og:site_name', value: 'tldr.io'});
  values.pageMetaProperties.push({ key: 'og:description', value: 'Interesting Content, Summarized by People'});
  values.pageMetaProperties.push({ key: 'fb:app_id', value: '250458838406360'});

  if (user) { values.loggedUser = user; }
  req.renderingValues = values;
  return cb();
}

/*
 * Middleware version of the above function
 */
function attachRenderingValues (req, res, next) {
  calculateRenderingValues(req, next);
}


/**
 * Common to all website routes
 * Cleanly separates API and website and attaches rendering values
 */
function websiteRoute (req, res, next) {
  var geo
    , country;
  // A website route was requested as an API handler. Redirect to API doc
  if (req.headers.host && config.apiHost && req.headers.host === config.apiHost) {
    return res.redirect(302, config.websiteUrl + '/api-documentation');
  }

  // If lang is specified in query don't do anything
  if (!req.query.lang) {
    geo = geoip.lookup(req.ip);
    if (geo) {
      country = geo.country.toLowerCase();
      if (country === 'de' || country === 'at') {
        req.query.lang = 'de';
      }
    }
  }
  attachRenderingValues(req, res, next);
}


/**
 * Common to all API routes.
 * Wrap it around API routes used for URLs reachable on the website, to avoid strange side effects
 */
function apiRouteDisambiguation (handler) {
  return function (req, res, next) {
    if (req.headers.host && config.origin && req.headers.host === config.origin) {
      return next();
    } else {
      handler(req, res, next);
    }
  };
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


/**
 * When API called with public URLs, log its usage by client
 */
function logAPIUsage (req, res, next) {
  var name = req.headers['api-client-name']
    , key = req.headers['api-client-key']
    , protocol = (req.protocol && req.protocol === 'https') ? "https://" : "http://"
    ;

  // This is not a public URL call
  // We will use this when the new version of the extension is rolled out
  //if (!name) {
    //if (req.headers.origin === protocol + config.origin) { return next(); }   // Make an exception for the website

    //return res.send(401, 'sorry, your api client name is unknown to us');
  //}

  if (!name) { return next(); }   // Don't break the extension and website stupidly for now

  if (clients[name] && clients[name].key === key) {   // We already have a cached version of this client
    clients[name].incrementRouteUsage(req.path);
    req.clientIsOfficial = clients[name].isOfficial ? true : false;
    return next();
  }

  // No cached version, look in database
  APIClient.findOne({ name: name }, function (err, apic) {
    if (err || !apic) { return res.send(401, 'Sorry, your API client name is unknown to us'); }
    if (key !== apic.key) { return res.send(401, 'Sorry, this key doesn\'t match this client name'); }

    clients[name] = apic;
    apic.incrementRouteUsage(req.path);
    req.clientIsOfficial = apic.isOfficial ? true : false;
    return next();
  });
}


module.exports.adminOnly = adminOnly;
module.exports.attachRenderingValues = attachRenderingValues;
module.exports.CORS = CORS;
module.exports.decorateRequest = decorateRequest;
module.exports.handleErrors = handleErrors;
module.exports.loggedInOnly = loggedInOnly;
module.exports.contentNegotiationHTML_JSON = contentNegotiationHTML_JSON;
module.exports.loggedInCheck = loggedInCheck;
module.exports.logAPIUsage = logAPIUsage;
module.exports.websiteRoute = websiteRoute;
module.exports.apiRouteDisambiguation = apiRouteDisambiguation;
