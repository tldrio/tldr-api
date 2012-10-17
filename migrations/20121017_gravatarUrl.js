/*
 * This migration initializes the gravatar for every newly joining user
 * We use their login email by default
 * Date: 09/10/2012
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
                     );

console.log('===== Beginning migration =====');
console.log('Connecting to DB ' + config.dbHost + ':' + config.dbPort + '/' + config.dbName)

async.waterfall([
  function (cb) {
    db.connectToDatabase(function() {
      console.log('Connected');
      cb();
    });
  }

  // Add the gravatarUrl field to all users
, function (cb) {
    var i = 0;

    console.log('Adding and populating the gravatarUrl field to the user schema');

    User.find({ gravatarUrl: { $exists: false } }, function(err, users) {
      if (err) { return cb(err); }

      async.whilst(
        function () { return i < users.length; }
      , function (cb) {
          console.log('Adding gravatarUrl to: ' + users[i]._id);

          users[i].setGravatarUrl(users[i].email, function(err) {
            if (err) { return cb(err); }

            i += 1;
            cb();
          });
        }
      , cb);
    });
  }
  // test that all the users docs have a gravatarUrl field
, function (cb) {
    User.find({ gravatarUrl: { $exists: false } }, function(err, users) {
      if (users.length === 0) {
        console.log("Everything worked");
      } else {
        console.log("Wtf it didnt work");
      }

      cb();
    });
  }
], function (err) {
    if (err) {
      console.log('Something unexpected occured, stopped migration. ', err);
    }

    db.closeDatabaseConnection(function () {
      console.log('Closed connection to database');
      process.exit(0);
    });
  }
);
