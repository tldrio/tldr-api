/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , fs = require('fs')
  , bunyan = require('./lib/logger').bunyan // Audit logger for express
  , models = require('./lib/models')
  , app                               // Will store our express app
  , config = require('./lib/config')
  , middleware = require('./lib/middleware')
  , passport = require('./lib/passport')
  , routes = require('./lib/routes')
  , customUtils = require('./lib/customUtils')
  , h4e = require('h4e')
  , beforeEach = require('express-group-handlers').beforeEach
  ;



app = express();


// Set up templating
h4e.setup({ app: app
          , baseDir: config.templatesDir
          , toCompileDirs: ['website', 'emails']
          , extension: 'mustache'
          });


// Trust the nginx proxy
app.enable('trust proxy');

// Block misleading calls to /favicon.ico in development
if (config.env === 'development') {
  app.use(function (req, res, next) {
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


// Respond to OPTIONS request - CORS middleware sets all the necessary headers
app.options('*', function (req, res, next) {
  res.send(200);
});

// API/website hybrid for retrocompatibility
app.get('/tldrs/:id', middleware.contentNegotiationHTML_JSON(routes.website.tldrPage, routes.getTldrById));


// Tldr embed in any webpage
app.get('/tldrs/embed/:id', routes.website.tldrEmbed);


// 3rd party auth with Google
app.get('/third-party-auth/google', function (req, res, next) {
                                      req.session.returnUrl = req.query.returnUrl;
                                      req.session.googleAuthThroughPopup = req.query.googleAuthThroughPopup;
                                      next();
                                    }
                                  , passport.authenticate('google'));
app.get('/third-party-auth/google/return', passport.customAuthenticateWithGoogle);
app.get('/third-party-auth/google/successPopup', routes.website.googleSSOWithPopup);


/*
 * Routes for the website, which all respond HTML
 */
beforeEach(app, middleware.websiteRoute, function (app) {
  // General pages
  app.get('/about', routes.website.about);
  app.get('/', middleware.loggedInCheck({ ifLogged: function (req, res, next) { return res.redirect(302, '/discover'); }
                                        , ifNotLogged: routes.website.index }));
  app.get('/signup', middleware.loggedInCheck({ ifLogged: function (req, res, next) { return res.redirect(302, req.query.returnUrl || '/discover'); }
                                              , ifNotLogged: routes.website.signup }));

  app.get('/tldrs', function (req, res, next) { return res.redirect(301, '/discover'); });
  app.get('/latest-summaries', function (req, res, next) { return res.redirect(301, '/discover'); });

  app.get('/what-is-tldr', routes.website.whatisit);
  app.get('/whatisit', function (req, res, next) { return res.redirect(301, '/what-is-tldr'); });

  app.get('/browser-extension', routes.website.browser_extension);
  app.get('/chrome-extension', function (req, res, next) { return res.redirect(301, '/browser-extension'); });
  app.get('/crx', function (req, res, next) { return res.redirect(301, '/browser-extension'); });
  app.get('/extension', function (req, res, next) { return res.redirect(301, '/browser-extension'); });
  app.get('/chromeextension', function (req, res, next) { return res.redirect(301, '/browser-extension'); });
  app.get('/api-documentation', routes.website.apiDoc);
  app.get('/release-notes', routes.website.releaseNotes);
  app.get('/embedded-tldrs', routes.website.embeddedTldrs);

  app.get('/elad', routes.website.elad);

  //Discover
  app.get('/discover', routes.website.discover.loadTldrs, routes.website.discover.displayPage);
  app.get('/discover/newest', function (req, res, next) { return res.redirect(302, '/discover'); });
  app.get('/discover/mostread', function (req, res, next) { req.params.sort = 'mostread'; next(); }, routes.website.discover.loadTldrs, routes.website.discover.displayPage);
  app.get('/discover/all', routes.website.discover.loadTldrs, routes.website.discover.displayPage);
  app.get('/discover/all/newest', function (req, res, next) { return res.redirect(302, '/discover'); });
  app.get('/discover/all/mostread', function (req, res, next) { req.params.sort = 'mostread'; next(); }, routes.website.discover.loadTldrs, routes.website.discover.displayPage);

  app.get('/discover/:topic', function (req, res, next) { req.params.sort = 'newest'; next(); }, routes.website.discover.loadTldrsByCategory, routes.website.discover.displayPage);
  app.get('/discover/:topic/newest', function (req, res, next) { return res.redirect(302, '/discover/' + req.params.topic); });
  app.get('/discover/:topic/:sort', routes.website.discover.loadTldrsByCategory, routes.website.discover.displayPage);


  // Tldr page
  app.get('/tldrs/:id/:slug', routes.website.tldrPage);

  // Login, logout
  app.get('/logout', function (req, res, next) { req.logOut(); res.redirect('/'); });
  app.get('/login', routes.website.login);

  app.get('/third-party-auth/pick-username', routes.website.pickUsername.displayForm);
  app.post('/third-party-auth/pick-username', routes.website.pickUsername.changeUsername);

  // Email confirmation, password recovery, unsubscribe route
  app.get('/confirmEmail', routes.website.confirmEmail);
  app.get('/forgotPassword', routes.website.forgotPassword);
  app.get('/resetPassword', routes.website.resetPassword);
  app.get('/notifications/unsubscribe', routes.website.unsubscribe);

  // Private pages
  app.get('/account', middleware.loggedInOnly, routes.website.account);
  app.get('/tldrscreated', middleware.loggedInOnly, routes.website.tldrscreated);
  app.get('/notifications', middleware.loggedInOnly, routes.website.notifications);
  app.get('/impact', middleware.loggedInOnly, routes.website.analytics.displayAnalytics);

  // Forum
  app.get('/forum/threads', routes.website.forum);
  app.get('/forum/topics', function (req, res, next) { return res.redirect(301, '/forum/threads'); });   // Legacy
  app.get('/forum/threads/:id/:slug', routes.website.forumShowThread);   // Show a whole thread
  app.get('/forum/topics/:id/:slug', function (req, res, next) { return res.redirect(301, '/forum/threads/' + req.params.id + '/' + req.params.slug); });   // Legacy
  app.get('/forum/topics/:id', routes.website.forumShowThread);   // Will 301-redirect to the correct URL
  app.get('/forum/threads/:id', routes.website.forumShowThread);   // Will 301-redirect to the correct URL
  app.post('/forum/threads/:id/:slug', routes.website.forumAddPost, routes.website.forumShowThread);  // Post something to this thread
  app.get('/forum/newThread', middleware.loggedInOnly, routes.website.forumNewThread);
  app.get('/forum/newTopic', function (req, res, next) { return res.redirect(301, '/forum/newThread'); });   // Legacy
  app.post('/forum/newThread', middleware.loggedInOnly, routes.website.forumCreateThread, routes.website.forumNewThread);
  app.get('/forum/posts/:id/edit', routes.website.editPost);
  app.post('/forum/posts/:id/edit', routes.website.changePostText);

  // Admin inbcluding moderation
  beforeEach(app, middleware.adminOnly, function (app) {
    app.get('/scratchpad', routes.website.scratchpad);
    app.get('/moderation', routes.website.moderation);
    app.get('/add-categories', routes.website.addCategories);
    app.get('/embed-admin', function (req, res, next) { return res.redirect(302, '/embed-admin/14'); });
    app.get('/embed-admin/:daysBack', routes.website.embedAdmin);
    app.get('/:username/impact', routes.website.analytics.selectUserForAnalytics, routes.website.analytics.displayAnalytics);
  });

  // User profiles, leaderboard ...
  app.get('/:username', routes.website.userPublicProfile);   // Routes are matched in order so this one is matched if nothing above is matched

  // Admin only
});



/*
 * Start server
 */
app.launchServer = function (cb) {
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
app.stopServer = function (cb) {
  var callback = cb ? cb : function () {}
    , self = this;

  self.apiServer.close(function () {
    bunyan.info('Website stopped');
    callback();
  });
};



// exports
module.exports = app;
