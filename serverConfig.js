/**
 * Module dependencies.
 */

var express = require('express')
  , fs = require('fs')
  , bunyan = require('./lib/logger').bunyan // Audit logger for express
  , dbObject = require('./lib/db')
  , mongoose = require('mongoose')
  , models = require('./models')
  , consolidate = require('consolidate')
  , server                               // Will store our express serverr
  , RedisStore = require('connect-redis')(express)   // Will manage the connection to our Redis store
  , passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , authorization = require('./authorization')
  , customUtils = require('./lib/customUtils');


server = express(); // Instantiate server


/**
 * Common handlers
 *
 */

// Add specific headers for CORS 
function handleCORS (req, res, next) {
  res.header('Access-Control-Allow-Origin', server.get('origin') );
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


/*
 * Environments declaration and
 * Express' default environment is 'development'
 */
server.configure('development', function () {
  server.set('dbHost', 'localhost');
  server.set('dbPort', '27017');
  server.set('dbName', 'dev-db');
  server.set('svPort', 8787);
  server.set('apiUrl', 'http://localhost:8787');
  server.set('origin', 'http://localhost:8888');
  server.set('websiteUrl', 'http://localhost:8888/dist/website/local/public/');
  server.set('cookieMaxAge', 2 * 24 * 3600 * 1000);// Cookie options
  server.set('redisDb', 0);// Redis DB #. Other redis default options are fine for now
  server.locals = { scriptPath: 'data-main="http://localhost:8888/dist/page/local/src/page.js" src="http://localhost:8888/src/vendor/require/require.js"'
                  , cssPath: 'http://localhost:8888/dist/page/local/assets/css/page.css'
                  }; // This replaces the `view options` in express 3.x
  server.use(handleCORS);
  bunyan.setToLog = true;
});

server.configure('test', function () {
  server.set('dbHost', 'localhost');
  server.set('dbPort', '27017');
  server.set('dbName', 'test-db');
  server.set('svPort', 8787);
  server.set('apiUrl', 'http://localhost:8787');
  server.set('origin', 'http://localhost:8888');
  server.set('websiteUrl', 'http://localhost:8888/dist/website/local/public/');
  server.set('cookieMaxAge', 120 * 1000);   // Tests shouldnt take more than 2 minutes to complete
  server.set('redisDb', 9);// Redis DB #. Other redis default options are fine for now
  server.locals = { scriptPath: 'data-main="http://localhost:8888/dist/page/local/src/page.js" src="http://localhost:8888/src/vendor/require/require.js"'
                  , cssPath: 'http://localhost:8888/dist/page/local/assets/css/page.css'
                  }; // This replaces the `view options` in express 3.x
  server.use(handleCORS);
  bunyan.setToLog = true;
});

server.configure('staging', function () {
  server.set('dbHost', 'localhost');
  server.set('dbPort', '27017');
  server.set('dbName', 'prod-db');
  server.set('svPort', 9002);
  server.set('apiUrl', 'api.tldr.io/staging');
  server.set('origin', 'http://tldr.io');
  server.set('websiteUrl', 'http://tldr.io/staging');
  server.set('cookieMaxAge', 7 * 24 * 3600 * 1000);// Cookie options
  server.set('redisDb', 0);// Redis DB #. Other redis default options are fine for now
  server.locals = { scriptPath: 'http://tldr.io/page/page/src/page.js'
                  , cssPath: 'http://tldr.io/page/staging/assets/css/page.css'
                  }; // This replaces the `view options` in express 3.x
  server.use(handleCORS);
  bunyan.setToLog = true;
});

server.configure('production', function () {
  server.set('dbHost', 'localhost');
  server.set('dbPort', '27017');
  server.set('dbName', 'prod-db');
  server.set('svPort', 9001);
  server.set('apiUrl', 'api.tldr.io');
  server.set('origin', 'http://tldr.io');
  server.set('websiteUrl', 'http://tldr.io');
  server.set('cookieMaxAge', 7 * 24 * 3600 * 1000);// Cookie options
  server.set('redisDb', 0);// Redis DB #. Other redis default options are fine for now
  server.locals = { scriptPath: 'http://tldr.io/page/src/page.js'
                  , cssPath: 'http://tldr.io/page/assets/css/page.css'
                  };
  server.use(handleCORS);
  bunyan.setToLog = true;
});


/**
 * Last wall of defense. If an exception makes its way to the top, the service shouldn't
 * stop if it is run in production, but log a fatal error and send an email to us.
 * Of course, this piece of code should NEVER have to be called
 *
 * For development, we want the server to stop to understand what went wrong
 *
 * We don't do this for tests as it messes up mocha
 * The process needs to keep on running
 */
server.configure('staging', 'production', function () {
  // The process needs to keep on running
  process.on('uncaughtException', function(err) {
    bunyan.fatal({error: err, message: 'An uncaught exception was thrown'});
  });
});



// Store db Instance in server. Avoid multiple instantiation
// in test files
server.db = new dbObject( server.get('dbHost')
                        , server.get('dbName')
                        , server.get('dbPort')
                        );


/*
 * Main server configuration
 * All handlers to be defined here
 */

// Parse body
server.use(express.bodyParser());

// Middleware to send a dummy empty favicon so as to be able to debug easily
server.use(function(req, res, next) {
  if (req.url === '/favicon.ico') {
    return res.send(200, '');
  } else {
    return next();
  }
});

// Parse cookie data and use redis to store session data
server.use(express.cookieParser());
server.use(express.session({ secret: 'this is da secret, dawg'    // Used for cookie encryption

                           , key: 'tldr_session'                  // Name of our cookie

                           , cookie: { path: '/'                  // Cookie is resent for all pages. Strange: there was a bug when I used '/users'
                                                                  // Anyway since connect-session can be pretty stupid, any call outside /users created a new
                                                                  // entry in the Redis store, which is a dumb memory leak. Adding xhr: {withCredentials: true}
                                                                  // to the parameters of the $.ajax client calls enables the same session for all calls, thus
                                                                  // eliminating the memory leak

                                     , httpOnly: false            // false so that it can be accessed by javascript, not only HTTP/HTTPS

                                     , maxAge: server.get('cookieMaxAge')     // Sets a persistent cookie (duration in ms)
                                                                  // The TTL of the Redis Session is set to the same period, and reinitialized at every 'touch',
                                                                  // i.e. every request made that resends the cookie
                                     }
                           , store: new RedisStore({ db: server.get('redisDb') }) // 'db' option is the Redis store to use
                           }));



/*
 * Authentication strategy
 * and declaration of serialization/deserialization methods
 * PassPort Stuffs
 */


passport.use(new LocalStrategy({
      usernameField: 'email'   // Passport way of naming can't be changed ...
    , passwordField: 'password'
    , passReqToCallback: true   // Why the fuck wasn't this life-saving option NOT documented ?
    }
  , authorization.authenticateUser
));

passport.serializeUser(authorization.serializeUser);
passport.deserializeUser(authorization.deserializeUser);


// Use Passport for authentication and sessions
server.use(passport.initialize());
server.use(passport.session());

server.passport = passport;


/**
 * Middleware for assigning an id to each request and add logging
 *
 */

// Assign a unique ID to the request for logging purposes
// And logs the fact that the request was received
server.use(function(req, res, next) {
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
});


// Some other configs needed for express server

server.use(server.router); // Map routes see docs why we do it here
server.use(handleErrors); // Use middleware to handle errors

// Used for HTML templating
server.engine('mustache', consolidate.hogan); // Assign Hogan engine to .mustache files
server.set('view engine', 'mustache'); // Set mustache as the default extension
server.set('views', __dirname + '/views');
server.use(express.static(__dirname + '/css'));

// exports
module.exports = server;
