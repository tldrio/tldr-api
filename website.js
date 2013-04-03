/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , fs = require('fs')
  , bunyan = require('./lib/logger').bunyan // Audit logger for express
  , models = require('./lib/models')
  , website                               // Will store our express website
  , config = require('./lib/config')
  , middleware = require('./lib/middleware')
  , passport = require('./lib/passport')
  , routes = require('./lib/routes')
  , customUtils = require('./lib/customUtils')
  , h4e = require('h4e')
  , beforeEach = require('express-group-handlers').beforeEach
  ;



website = express();


// Set up templating
h4e.setup({ app: website
          , baseDir: config.templatesDir
          , toCompileDirs: ['website', 'emails']
          , extension: 'mustache'
          });


// Trust the nginx proxy
website.enable('trust proxy');

// Block misleading calls to /favicon.ico in development
if (config.env === 'development') {
  website.use(function (req, res, next) {
    if (req.path === '/favicon.ico') {
      return res.send(204);
    } else {
      return next();
    }
  });
}

/**
 * Middlewares
 */
website.use(middleware.CORS);
website.use(express.bodyParser());
website.use(express.cookieParser());// Parse cookie data and use redis to store session data
website.use(express.session(config.session));
website.use(passport.initialize());// Use Passport for authentication and sessions
website.use(passport.session());
website.use(middleware.decorateRequest); //Middleware for assigning an id to each request and add logging
website.use(middleware.logAPIUsage);
website.use(website.router); // Map routes
website.use(middleware.handleErrors); // Use middleware to handle errors

/*
 * Environments declaration and
 * Express' default environment is 'development'
 */

website.configure('development', 'staging', 'production', function () {
  bunyan.setToLog = true;
});


// Respond to OPTIONS request - CORS middleware sets all the necessary headers
website.options('*', function (req, res, next) {
  res.send(200);
});



// Tldr embed in any webpage
website.get('/tldrs/embed/:id', routes.website.tldrEmbed);


// 3rd party auth with Google
website.get('/third-party-auth/google', function (req, res, next) {
                                      req.session.returnUrl = req.query.returnUrl;
                                      req.session.googleAuthThroughPopup = req.query.googleAuthThroughPopup;
                                      next();
                                    }
                                  , passport.authenticate('google'));
website.get('/third-party-auth/google/return', passport.customAuthenticateWithGoogle);
website.get('/third-party-auth/google/successPopup', routes.website.googleSSOWithPopup);


/*
 * Routes for the website, which all respond HTML
 */
beforeEach(website, middleware.websiteRoute, function (website) {
  // Tldr page
  website.get('/tldrs/:id', routes.website.tldrPage);

  // General pages
  website.get('/about', routes.website.about);
  website.get('/', middleware.loggedInCheck({ ifLogged: function (req, res, next) { return res.redirect(302, '/discover'); }
                                        , ifNotLogged: routes.website.index }));
  website.get('/signup', middleware.loggedInCheck({ ifLogged: function (req, res, next) { return res.redirect(302, req.query.returnUrl || '/discover'); }
                                              , ifNotLogged: routes.website.signup }));

  website.get('/tldrs', function (req, res, next) { return res.redirect(301, '/discover'); });
  website.get('/latest-summaries', function (req, res, next) { return res.redirect(301, '/discover'); });

  website.get('/what-is-tldr', routes.website.whatisit);
  website.get('/whatisit', function (req, res, next) { return res.redirect(301, '/what-is-tldr'); });

  website.get('/browser-extension', routes.website.browser_extension);
  website.get('/chrome-extension', function (req, res, next) { return res.redirect(301, '/browser-extension'); });
  website.get('/crx', function (req, res, next) { return res.redirect(301, '/browser-extension'); });
  website.get('/extension', function (req, res, next) { return res.redirect(301, '/browser-extension'); });
  website.get('/chromeextension', function (req, res, next) { return res.redirect(301, '/browser-extension'); });
  website.get('/api-documentation', routes.website.apiDoc);
  website.get('/release-notes', routes.website.releaseNotes);
  website.get('/embedded-tldrs', routes.website.embeddedTldrs);

  website.get('/elad', routes.website.elad);

  //Discover
  website.get('/discover', routes.website.discover.loadTldrs, routes.website.discover.displayPage);
  website.get('/discover/newest', function (req, res, next) { return res.redirect(302, '/discover'); });
  website.get('/discover/mostread', function (req, res, next) { req.params.sort = 'mostread'; next(); }, routes.website.discover.loadTldrs, routes.website.discover.displayPage);
  website.get('/discover/all', routes.website.discover.loadTldrs, routes.website.discover.displayPage);
  website.get('/discover/all/newest', function (req, res, next) { return res.redirect(302, '/discover'); });
  website.get('/discover/all/mostread', function (req, res, next) { req.params.sort = 'mostread'; next(); }, routes.website.discover.loadTldrs, routes.website.discover.displayPage);

  website.get('/discover/:topic', function (req, res, next) { req.params.sort = 'newest'; next(); }, routes.website.discover.loadTldrsByCategory, routes.website.discover.displayPage);
  website.get('/discover/:topic/newest', function (req, res, next) { return res.redirect(302, '/discover/' + req.params.topic); });
  website.get('/discover/:topic/:sort', routes.website.discover.loadTldrsByCategory, routes.website.discover.displayPage);


  // Tldr page
  website.get('/tldrs/:id/:slug', routes.website.tldrPage);

  // Login, logout
  website.get('/logout', function (req, res, next) { req.logOut(); res.redirect('/'); });
  website.get('/login', routes.website.login);

  website.get('/third-party-auth/pick-username', routes.website.pickUsername.displayForm);
  website.post('/third-party-auth/pick-username', routes.website.pickUsername.changeUsername);

  // Email confirmation, password recovery, unsubscribe route
  website.get('/confirmEmail', routes.website.confirmEmail);
  website.get('/forgotPassword', routes.website.forgotPassword);
  website.get('/resetPassword', routes.website.resetPassword);
  website.get('/notifications/unsubscribe', routes.website.unsubscribe);

  // Private pages
  website.get('/account', middleware.loggedInOnly, routes.website.account);
  website.get('/tldrscreated', middleware.loggedInOnly, routes.website.tldrscreated);
  website.get('/notifications', middleware.loggedInOnly, routes.website.notifications);
  website.get('/impact', middleware.loggedInOnly, routes.website.analytics.displayAnalytics);

  // Forum
  website.get('/forum/threads', routes.website.forum);
  website.get('/forum/topics', function (req, res, next) { return res.redirect(301, '/forum/threads'); });   // Legacy
  website.get('/forum/threads/:id/:slug', routes.website.forumShowThread);   // Show a whole thread
  website.get('/forum/topics/:id/:slug', function (req, res, next) { return res.redirect(301, '/forum/threads/' + req.params.id + '/' + req.params.slug); });   // Legacy
  website.get('/forum/topics/:id', routes.website.forumShowThread);   // Will 301-redirect to the correct URL
  website.get('/forum/threads/:id', routes.website.forumShowThread);   // Will 301-redirect to the correct URL
  website.post('/forum/threads/:id/:slug', routes.website.forumAddPost, routes.website.forumShowThread);  // Post something to this thread
  website.get('/forum/newThread', middleware.loggedInOnly, routes.website.forumNewThread);
  website.get('/forum/newTopic', function (req, res, next) { return res.redirect(301, '/forum/newThread'); });   // Legacy
  website.post('/forum/newThread', middleware.loggedInOnly, routes.website.forumCreateThread, routes.website.forumNewThread);
  website.get('/forum/posts/:id/edit', routes.website.editPost);
  website.post('/forum/posts/:id/edit', routes.website.changePostText);

  // Admin including moderation
  beforeEach(website, middleware.adminOnly, function (website) {
    website.get('/scratchpad', routes.website.scratchpad);
    website.get('/moderation', routes.website.moderation);
    website.get('/add-categories', routes.website.addCategories);
    website.get('/embed-admin', function (req, res, next) { return res.redirect(302, '/embed-admin/14'); });
    website.get('/embed-admin/:daysBack', routes.website.embedAdmin);
    website.get('/:username/impact', routes.website.analytics.selectUserForAnalytics, routes.website.analytics.displayAnalytics);
  });

  // User profiles, leaderboard ...
  website.get('/:username', routes.website.userPublicProfile);   // Routes are matched in order so this one is matched if nothing above is matched

  // Admin only
});



/*
 * Start server
 */
website.launchServer = function (cb) {
  var callback = cb ? cb : function () {}
    , self = this;

  self.apiServer = http.createServer(self);   // Let's not call it 'server' we never know if express will want to use this variable!

  // Handle any connection error gracefully
  self.apiServer.on('error', function (err) {
    bunyan.fatal(err);
    bunyan.fatal("An error occured while launching the server, probably a server is already running on the same port!");
    process.exit(1);
  });

  // Begin to listen. If the callback gets called, it means the server was successfully launched
  self.apiServer.listen.apply(self.apiServer, [config.websitePort, function() {
    bunyan.info('Website launched in %s environment, on port %s.', config.env, config.websitePort);
    callback();
  }]);
};


/*
 * Stop the server
 * No new connections will be accepted but existing ones will be served before closing
 */
website.stopServer = function (cb) {
  var callback = cb ? cb : function () {}
    , self = this;

  self.apiServer.close(function () {
    bunyan.info('Website stopped');
    callback();
  });
};



// exports
module.exports = website;
