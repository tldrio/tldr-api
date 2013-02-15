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
    User.find({}, function (err, users) {
      if (err) { return cb(err); }

      users.forEach(function (user) {
        if (user.username.toLowerCase() !== user.usernameLowerCased) {
          console.log(user._id);
        }
      });

      cb();
    });
  }
], function (err) {
    db.closeDatabaseConnection(function () {
      console.log('Closed connection to database');
      process.exit(0);
    });
  }
);

