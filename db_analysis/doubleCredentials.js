/*
 * Get the names email addresses of our active users
 *
 */

var async = require('async')
  , _ = require('underscore')
  , models = require('../lib/models')
  , Tldr = models.Tldr
  , User = models.User
  , DbObject = require('../lib/db')
  , config = require('../lib/config')
  , customUtils = require('../lib/customUtils')
  , db = new DbObject( config.dbHost
                     , config.dbName
                     , config.dbPort
                     )
  , j = 0
  ;

async.waterfall([
  // Connect to db
  function (cb) {
    db.connectToDatabase(function() {
      console.log('Connected');
      cb();
    });
  }

  // Get the active contributors
, function (cb) {
    User.find({ confirmedEmail: false }, function (err, users) {
      if (err) { return cb(err); }

      _.each(users, function (user) {
        console.log(user.email);
        j += 1;
      });

      cb();
    });
  }
], function (err) {
    console.log("Found " + j);
    db.closeDatabaseConnection(function () {
      console.log('Closed connection to database');
      process.exit(0);
    });
  }
);

