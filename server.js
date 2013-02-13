/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , fs = require('fs')
  , bunyan = require('./lib/logger').bunyan // Audit logger for express
  , DbObject = require('./lib/db')
  , models = require('./lib/models')
  , app                               // Will store our express app
  , config = require('./lib/config')
  , middleware = require('./lib/middleware')
  , passport = require('./lib/passport')
  , routes = require('./lib/routes')
  , customUtils = require('./lib/customUtils')
  , notificator = require('./lib/notificator')
  , h4e = require('h4e');



app = express();

// Store db Instance in app. Avoid multiple instantiation in test files
app.db = new DbObject( config.dbHost
                        , config.dbName
                        , config.dbPort
                        );

// Set up templating
h4e.setup({ app: app
          , baseDir: config.templatesDir
          , toCompileDirs: ['website', 'emails']
          , extension: 'mustache'
          });


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
app.use(middleware.logAPIUsage);
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

// User login/logout
app.post('/users/login', passport.authenticate('local'), routes.getLoggedUser);
app.get('/users/logout', routes.logout);

// Tldrs
app.get('/tldrs/search', routes.searchTldrs);
app.post('/tldrs/searchBatch', routes.searchTldrsByBatch);
app.post('/tldrs', routes.createNewTldr);
app.get('/tldrs/latest/:quantity', routes.getLatestTldrs);
app.get('/tldrs/latest', routes.getLatestTldrs);
app.put('/tldrs/:id', routes.updateTldrWithId);
// IN EXPERIMENT
app.put('/tldrs/thank/:id', routes.thankContributor);

// routes for emails gathered during a product launch
app.post('/subscribeEmailAddress', routes.subscribeEmailAddress);


// Admin only routes
app.get('/:username/admin', middleware.adminOnly, routes.getUser);
app.get('/tldrs/:id/admin', middleware.adminOnly, routes.getTldrById);
app.get('/tldrs/:id/delete', middleware.adminOnly, routes.deleteTldr);   // Delete tldr
app.get('/tldrs/:id/moderate', middleware.adminOnly, routes.moderateTldr);
app.put('/tldrs/:id/distribution-channels', middleware.adminOnly, routes.updateDistributionChannels);
app.get('/tldrs/:id/cockblock', middleware.adminOnly, routes.cockblockTldr);

// Vote for/against a topic
app.put('/forum/topics/:id', routes.voteOnTopic);

// Private Webhooks routes
app.post('/private/privateMailchimpWebhookSync', routes.mailchimpWebhookSync);
app.get('/private/privateMailchimpWebhookSync', routes.mailchimpWebhookSync);

// Respond to OPTIONS request - CORS middleware sets all the necessary headers
app.options('*', function (req, res, next) {
  res.send(200);
});

// Only hybrid for retrocompatibility
app.get('/tldrs/:id', middleware.contentNegotiationHTML_JSON(routes.website_tldrPage, routes.getTldrById));


/*
 * Routes for the website, which all respond HTML
 *
 */
// General pages
app.get('/about', middleware.websiteRoute, routes.website_about);
app.get('/', middleware.websiteRoute     // Routing for this page depends on the logged in status
           , middleware.loggedInCheck({ ifLogged: function (req, res, next) { return res.redirect(302, '/latest-summaries'); }
                                      , ifNotLogged: routes. website_index }));
app.get('/signup', middleware.websiteRoute
                 , middleware.loggedInCheck({ ifLogged: function (req, res, next) { return res.redirect(302, req.query.returnUrl || '/latest-summaries'); }
                                            , ifNotLogged: routes.website_signup }));

app.get('/latest-summaries', middleware.websiteRoute, routes.website_tldrs);
app.get('/tldrs', function (req, res, next) { return res.redirect(301, '/latest-summaries'); });

app.get('/what-is-tldr', middleware.websiteRoute, routes.website_whatisit);
app.get('/whatisit', function (req, res, next) { return res.redirect(301, '/what-is-tldr'); });

app.get('/chrome-extension', middleware.websiteRoute, routes.website_chrome_extension);
app.get('/crx', function (req, res, next) { return res.redirect(301, '/chrome-extension'); });
app.get('/extension', function (req, res, next) { return res.redirect(301, '/chrome-extension'); });
app.get('/chromeextension', function (req, res, next) { return res.redirect(301, '/chrome-extension'); });
app.get('/api-documentation', middleware.websiteRoute, routes.website_apiDoc);


// Tldr page
app.get('/tldrs/:id/:slug', middleware.websiteRoute, routes.website_tldrPage);

// Login, logout
app.get('/logout', function (req, res, next) { req.logOut(); res.redirect('/'); });
app.get('/login', routes.website_login);

// 3rd party auth with Google
app.get('/third-party-auth/google', function (req, res, next) { req.session.returnUrl = req.query.returnUrl; next(); }, passport.authenticate('google'));
app.get('/third-party-auth/google/return', passport.customAuthenticateWithGoogle);
app.get('/third-party-auth/pick-username', middleware.websiteRoute, routes.website_pickUsername.displayForm);
app.post('/third-party-auth/pick-username', middleware.websiteRoute, routes.website_pickUsername.changeUsername);

// Email confirmation, password recovery
app.get('/confirmEmail', middleware.websiteRoute, routes.website_confirmEmail);
app.get('/forgotPassword', middleware.websiteRoute, routes.website_forgotPassword);
app.get('/resetPassword', middleware.websiteRoute, routes.website_resetPassword);

// Private pages
app.get('/account', middleware.loggedInOnly, middleware.websiteRoute, routes.website_account);
app.get('/tldrscreated', middleware.loggedInOnly, middleware.websiteRoute, routes.website_tldrscreated);
app.get('/notifications', middleware.loggedInOnly, middleware.websiteRoute, routes.website_notifications);

// Forum
app.get('/forum/topics', middleware.websiteRoute, routes.website_forum);
app.get('/forum/topics/:id/:slug', middleware.websiteRoute, routes.website_forumShowTopic);   // Show a whole topic
app.get('/forum/topics/:id', middleware.websiteRoute, routes.website_forumShowTopic);   // For retrocompatibility
app.post('/forum/topics/:id', middleware.websiteRoute, routes.website_forumAddPost, routes.website_forumShowTopic);  // Post something to this topic
app.get('/forum/newTopic', middleware.loggedInOnly, middleware.websiteRoute, routes.website_forumNewTopic);    // Display the newTopic form
app.post('/forum/newTopic', middleware.loggedInOnly, middleware.websiteRoute, routes.website_forumCreateTopic, routes.website_forumNewTopic);   // Create a new topic with the POSTed data
app.get('/forum/posts/:id/edit', middleware.websiteRoute, routes.website_editPost);
app.post('/forum/posts/:id/edit', routes.website_changePostText);

// Moderation
app.get('/moderation', middleware.websiteRoute, middleware.adminOnly, routes.website_moderation);

// User profiles, leaderboard ...
app.get('/:username', middleware.websiteRoute, routes.website_userPublicProfile);   // Routes are matched in order so this one is matched if nothing above is matched


/*
 * Compile all templates and partials, connect to database, then start server
 */
app.launchServer = function (cb) {
  var callback = cb ? cb : function () {}
    , self = this;

  self.db.connectToDatabase(function(err) {
    if (err) { return callback(err); }

    self.apiServer = http.createServer(self);   // Let's not call it 'server' we never know if express will want to use this variable!

    // Handle any connection error gracefully
    self.apiServer.on('error', function (err) {
      bunyan.fatal(err);
      bunyan.fatal("An error occured while launching the server, probably a server is already running on the same port!");
      process.exit(1);
    });

    // Begin to listen. If the callback gets called, it means the server was successfully launched
    self.apiServer.listen.apply(self.apiServer, [config.svPort, function() {
      bunyan.info('Server %s launched in %s environment, on port %s. Db name is %s on port %d', self.name, config.env, config.svPort, config.dbName, config.dbPort);
      callback();
    }]);
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
