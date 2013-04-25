/**
 * Module dependencies.
 */

var express = require('express')
  , api = express()
  , http = require('http')
  , fs = require('fs')
  , bunyan = require('./lib/logger').bunyan
  , models = require('./lib/models')
  , config = require('./lib/config')
  , middleware = require('./lib/middleware')
  , passport = require('./lib/passport')
  , routes = require('./lib/routes')
  , customUtils = require('./lib/customUtils')
  , beforeEach = require('express-group-handlers').beforeEach
  ;


// Trust the nginx proxy
api.enable('trust proxy');


/**
 * Middlewares
 */
api.use(middleware.CORS);
api.use(express.bodyParser());
api.use(express.cookieParser());// Parse cookie data and use redis to store session data
api.use(express.session(config.session));
api.use(passport.initialize());// Use Passport for authentication and sessions
api.use(passport.session());
api.use(middleware.decorateRequest); //Middleware for assigning an id to each request and add logging
api.use(middleware.logAPIUsage);
api.use(api.router); // Map routes
api.use(middleware.handleErrors); // Use middleware to handle errors


// Email confirmation
api.post('/confirm', routes.confirmUserEmail);
api.get('/resendConfirmToken', routes.resendConfirmToken);

// Password reset
api.post('/user/sendResetPasswordEmail', routes.sendResetPasswordEmail);
api.post('/user/resetPassword', routes.resetPassword);

// Account management
api.post('/users', routes.createNewUser); // User creation
api.get('/users/you', routes.getLoggedUser);// Get/set personal information
api.get('/users/you/createdtldrs', routes.getCreatedTldrs);
api.put('/users/you', routes.updateProfile);
api.put('/users/you/updatePassword', routes.updatePassword);
api.put('/users/you/updateGravatarEmail', routes.updateGravatarEmail);
api.delete('/users/you', routes.deleteUser);

// User login/logout
api.post('/users/login', passport.authenticate('local'), routes.getLoggedUser);
api.get('/users/logout', routes.logout);

api.get('/users/:username', routes.getUser.getPublicProfile);
api.get('/users/:username/tldrs[cC]reated', routes.getUser.getTldrsCreated);

// Tldrs
api.get('/tldrs/search', routes.searchTldrs);
api.get('/tldrs/filter', routes.getTldrsByCategory.getTldrsByCategoryName);
api.get('/tldrs/:id/stats', routes.getStats.getStatsForTldr);
api.get('/tldrs/latest/:quantity', routes.getLatestTldrs);
api.get('/tldrs/latest', routes.getLatestTldrs);
api.get('/tldrs/:id', routes.getTldrById);
api.post('/tldrs', routes.createNewTldr);
api.post('/tldrs/searchBatch', routes.searchTldrsByBatch);
api.put('/tldrs/incrementReadCountByBatch', routes.incrementReadCountByBatch);
api.put('/tldrs/:id', routes.updateTldrWithId);
api.put('/tldrs/:id/thank', routes.thankContributor);
api.delete('/tldrs/:id', routes.deleteTldrIfPossible);

api.put('/subscriptions/:id/add', routes.addSubscriber);

// routes for emails gathered during a product launch
api.post('/subscribeEmailAddress', routes.subscribeEmailAddress);

// Categories
api.get('/categories', routes.getCategories);


// Admin only routes
beforeEach(api, middleware.adminOnly, function (api) {
  api.get('/tldrs/:id/admin', routes.getTldrById);
  api.get('/tldrs/:id/delete', routes.deleteTldr);
  api.get('/tldrs/:id/moderate', routes.moderateTldr);
  api.get('/tldrs/:id/cockblock', routes.cockblockTldr);
  api.put('/tldrs/:id/distribution-channels', routes.updateDistributionChannels);
  api.put('/tldrs/:id/sharing-buffer', routes.shareThroughBuffer);
});

// Vote for/against a thread
api.put('/forum/topics/:id', routes.voteOnThread);   // Legacy
api.put('/forum/threads/:id', routes.voteOnThread);

// Private Webhooks routes
api.post('/private/privateMailchimpWebhookSync', routes.mailchimpWebhookSync);
api.get('/private/privateMailchimpWebhookSync', routes.mailchimpWebhookSync);

// Respond to OPTIONS request - CORS middleware sets all the necessary headers
api.options('*', function (req, res, next) {
  res.send(200);
});






// Launch the API server
api.launchServer = function (cb) {
  var callback = cb ? cb : function () {}
    , self = this;

    self.apiServer = http.createServer(self);   // Let's not call it 'server' we never know if express will want to use this variable!

    // Handle any connection error gracefully
    self.apiServer.on('error', function (err) {
      bunyan.fatal(err);
      bunyan.fatal("An error occured while launching the API, probably a server is already running on the same port!");
      process.exit(1);
    });

    // Begin to listen. If the callback gets called, it means the server was successfully launched
    self.apiServer.listen.apply(self.apiServer, [config.apiPort, function() {
      bunyan.info('API launched in %s environment, on port %s.', config.env, config.apiPort);
      callback();
    }]);
};


/*
 * Stop the API
 * No new connections will be accepted but existing ones will be served before closing
 */
api.stopServer = function (cb) {
  var callback = cb ? cb : function () {}
    , self = this;

  self.apiServer.close(function () {
    bunyan.info('API stopped');
    callback();
  });
};





// exports
module.exports = api;
