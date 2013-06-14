/**
 * Main module, responsible for connecting to the db and launching the
 * two Express apps (website and api)
 */
var DbObject = require('./lib/db')
  , config = require('./lib/config')
  , bunyan = require('./lib/logger').bunyan
  , api = require('./api')
  , website = require('./website')
  , app = {}
  , async = require('async')
  , urlNormalization = require('./lib/urlNormalization')
  , notificator = require('./lib/notificator')   // We need to launch the notificator somewhere
  ;

// Create connection to the database
app.db = new DbObject( config.dbHost
                     , config.dbName
                     , config.dbPort
                     );


// Bunyan should not log in tests or the report will be cluttered
if (config.env !== 'test') { bunyan.setToLog = true; }



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
if (config.env === 'staging' || config.env === 'production') {
  process.on('uncaughtException', function(err) {
    bunyan.fatal({error: err, message: 'An uncaught exception was thrown'});
  });
}


// Launch da lil mafucca
app.launch = function (cb) {
  var callback = cb || function () {}
    , self = this;

  async.waterfall([
  function (cb) {
    self.db.connectToDatabase(function (err) {
      if (!err) { bunyan.info('Connection to the database opened'); }
      return cb(err);
    });
  }
  , function (cb) {
    urlNormalization.querystringOffenders.updateCacheFromDatabase(cb);
  }
  , function (cb) {
    api.launchServer(function () {
      website.launchServer(function () {
        cb();
      });
    });
  }
  ], callback);

};


// Stop it, duh
app.stop = function (cb) {
  var callback = cb || function () {}
    , self = this;

  api.stopServer(function () {
    website.stopServer(function () {
      self.db.closeDatabaseConnection(function () {
        bunyan.info('Connection to the database closed');
        callback();
      });
    });
  });
};



/*
 * Automatically launch the application if the module was not required
 */
if (module.parent === null) {
  app.launch();
}


module.exports = app;
