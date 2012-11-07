/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , fs = require('fs')
  , bunyan = require('./lib/logger').bunyan // Audit logger for express
  , DbObject = require('./lib/db')
  , mongoose = require('mongoose')
  , models = require('./lib/models')
  , app                               // Will store our express app
  , config = require('./lib/config')
  , middleware = require('./lib/middleware')
  , passport = require('./lib/passport')
  , routes = require('./lib/routes')
  , customUtils = require('./lib/customUtils')
  , hogan = require('hogan.js')
  , customHogan = require('./lib/customHogan');



app = express();

// Store db Instance in app. Avoid multiple instantiation in test files
app.db = new DbObject( config.dbHost
                        , config.dbName
                        , config.dbPort
                        );

// Used for HTML templating
app.engine('mustache', customHogan.render); // Assign Hogan engine to .mustache files
app.set('view engine', 'mustache'); // Set mustache as the default extension
app.set('views', config.templatesDir);

// Trust the nginx proxy
app.enable('trust proxy');

/**
 * Middlewares
 *
 */


app.use(middleware.CORS);
app.use(express.bodyParser());
app.use(express.cookieParser());// Parse cookie data and use redis to store session data
app.use(express.session(config.session));
app.use(passport.initialize());// Use Passport for authentication and sessions
app.use(passport.session());
app.use(middleware.decorateRequest); //Middleware for assigning an id to each request and add logging
app.use(app.router); // Map routes
app.use(middleware.handleErrors); // Use middleware to handle errors

/*
 * Environments declaration and
 * Express' default environment is 'development'
 */

app.configure('development', 'staging', 'production', function () {
  bunyan.setToLog = true;
});

/**
 * Last wall of defense. If an exception makes its way to the top, the service shouldn't
 * stop if it is run in production, but log a fatal error and send an email to us.
 * Of course, this piece of code should NEVER have to be called
 *
 * For development, we want the app to stop to understand what went wrong
 *
 * We don't do this for tests as it messes up mocha
 * The process needs to keep on running
 */
app.configure('staging', 'production', function () {
  // The process needs to keep on running
  process.on('uncaughtException', function(err) {
    bunyan.fatal({error: err, message: 'An uncaught exception was thrown'});
  });
});



/**
 * Routes for the API
 *
 */

// Email confirmation
app.post('/confirm', routes.confirmUserEmail);
app.get('/resendConfirmToken', routes.resendConfirmToken);

// Password reset
app.post('/user/sendResetPasswordEmail', routes.sendResetPasswordEmail);
app.post('/user/resetPassword', routes.resetPassword);

// Account management
app.post('/users', routes.createNewUser); // User creation
app.get('/users/you', routes.getLoggedUser);// Get/set personal information
app.get('/users/you/createdtldrs', routes.getCreatedTldrs);
app.put('/users/you', routes.updateProfile);
app.put('/users/you/updatePassword', routes.updatePassword);
app.put('/users/you/updateGravatarEmail', routes.updateGravatarEmail);
app.put('/users/you/notifications/markAllAsSeen', routes.markAllNotificationsAsSeen);

// User login/logout
app.post('/users/login', passport.authenticate('local'), routes.getLoggedUser);// Handles a user connection and credentials check.
app.get('/users/logout', routes.logout);

// Tldrs
app.get('/tldrs/search', routes.searchTldrs);
app.get('/tldrs', routes.searchTldrs); // Convenience route
app.post('/tldrs/searchBatch', routes.searchTldrsByBatch);
app.post('/tldrs', routes.createNewTldr);
app.get('/tldrs/latest/:quantity', routes.getLatestTldrs);
app.put('/tldrs/:id', routes.updateTldrWithId);

// Notifications
app.put('/notifications/:id', routes.updateNotification);

// Admin only routes
app.get('/tldrs/:id/admin', middleware.adminOnly, routes.getTldrById);
app.get('/tldrs/beatricetonusisfuckinggorgeousnigga/:id', middleware.adminOnly, routes.deleteTldr);   // delete tldr
app.get('/users/:id', middleware.adminOnly, routes.getUserById);

// Vote for/against a topic
app.put('/forum/topics/:id', routes.voteOnTopic);

// Private Webhooks routes
app.post('/private/privateMailchimpWebhookSync', routes.mailchimpWebhookSync);
app.get('/private/privateMailchimpWebhookSync', routes.mailchimpWebhookSync);

// Respond to OPTIONS request - CORS middleware sets all the necessary headers
app.options('*', function (req, res, next) {
  res.send(200);
});



/*
 * Hybrid routes that can either serve HTML or JSON depending on the requested content type
 *
 */
app.get('/tldrs/:id', middleware.routeIfHTML(routes.website_tldrPage, routes.getTldrById));



/*
 * Routes for the website, which all respond HTML
 *
 */
// General pages
app.get('/about', middleware.attachRenderingValues, routes.website_about);
app.get('/index', middleware.attachRenderingValues, routes.website_index);
app.get('/signup', middleware.attachRenderingValues, routes.website_signup);
app.get('/summaries', middleware.attachRenderingValues, routes.website_summaries);
app.get('/whatisit', middleware.attachRenderingValues, routes.website_whatisit);

// Login, logout
app.get('/logout', function (req, res, next) { req.logOut(); return next(); }
                 , routes.website_index);
app.get('/login', routes.website_login);

// Email confirmation, password recovery
app.get('/confirmEmail', middleware.attachRenderingValues, routes.website_confirmEmail);
app.get('/forgotPassword', middleware.attachRenderingValues, routes.website_forgotPassword);
app.get('/resetPassword', middleware.attachRenderingValues, routes.website_resetPassword);

// Private pages
app.get('/account', middleware.loggedInOnly, middleware.attachRenderingValues, routes.website_account);
app.get('/tldrscreated', middleware.loggedInOnly, middleware.attachRenderingValues, routes.website_tldrscreated);
app.get('/notifications', middleware.loggedInOnly, middleware.attachRenderingValues, routes.website_notifications);

// Forum
app.get('/forum/topics', middleware.attachRenderingValues, routes.website_forum);
app.get('/forum/topics/:id', middleware.attachRenderingValues, routes.website_forumShowTopic);   // Show a whole topic
app.post('/forum/topics/:id', middleware.attachRenderingValues, routes.website_forumAddPost, routes.website_forumShowTopic);  // Post something to this topic
app.get('/forum/newTopic', middleware.loggedInOnly, middleware.attachRenderingValues, routes.website_forumNewTopic);    // Display the newTopic form
app.post('/forum/newTopic', middleware.loggedInOnly, middleware.attachRenderingValues, routes.website_forumCreateTopic, routes.website_forumNewTopic);   // Create a new topic with the POSTed data

// User profiles, leaderboard ...
app.get('/:username', middleware.attachRenderingValues, routes.website_userPublicProfile);   // Routes are matched in order so this one is matched if nothing above is matched



/*
 * Compile all templates and partials, connect to database, then start server
 */
app.launchServer = function (cb) {
  var callback = cb ? cb : function () {}
    , self = this;

  customHogan.readAndCompileTemplates('page', function () {
    customHogan.readAndCompileTemplates('website', function () {
      self.db.connectToDatabase(function(err) {
        if (err) { return callback(err); }

        self.apiServer = http.createServer(self);   // Let's not call it 'server' we never know if express will want to use this variable!

        // Handle any connection error gracefully
        self.apiServer.on('error', function () {
          bunyan.fatal("An error occured while launching the server, probably a server is already running on the same port!");
          process.exit(1);
        });

        // Begin to listen. If the callback gets called, it means the server was successfully launched
        self.apiServer.listen.apply(self.apiServer, [config.svPort, function() {
          bunyan.info('Server %s launched in %s environment, on port %s. Db name is %s on port %d', self.name, config.env, config.svPort, config.dbName, config.dbPort);
          callback();
        }]);
      });
    });
  });
};


/*
 * Stop the server and then close the connection to the database
 * No new connections will be accepted but existing ones will be served before closing
 */
app.stopServer = function (cb) {
  var callback = cb ? cb : function () {}
    , self = this;

  self.apiServer.close(function () {
    self.db.closeDatabaseConnection(function () {
      bunyan.info('Server was stopped and connection to the database closed');
      callback();
    });
  });
};


/*
 * If we executed this module directly, launch the server.
 * If not, let the module which required server.js launch it.
 */
if (module.parent === null) { // Code to execute only when running as main
  app.launchServer();
}


/*
 * If SIGINT is received (from Ctrl+C or from Upstart), gracefully stop the server then exit the process
 * FOR NOW: commented out because browsers use hanging connections so every shutdown actually takes a few seconds (~5) if a browser connected to the server
 *          which makes for a way too long restart
 */
//process.on('SIGINT', function () {
  //app.stopServer(function () {
    //bunyan.info('Exiting process');
    //process.exit(0);
  //});
//});



// exports
module.exports = app;
