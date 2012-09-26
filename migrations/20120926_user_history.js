/*
 * This migration was necessary once we defined the new required field "history" on User
 * It adds a new history to all users that currently don't have one
 * Date: 26/09/2012
 *
 */

var async = require('async')
  , _ = require('underscore')
  , models = require('../lib/models')
  , User = models.User
  , UserHistory = models.UserHistory
  , DbObject = require('../lib/db')
  , config = require('../lib/config')
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

  // Add a new User to users that currently don't have one
, function (cb) {
    var i = 0;

    console.log("Adding missing histories to users");

    User.find({ history: undefined }, function(err, users) {
      if (err) { return cb(err); }

      console.log('Found some users with no history: ' + users.length);

      async.whilst(
        function () { return i < users.length; }
      , function (cb) {
          var newHistory;

          if (! users[i].history) {
            console.log('Adding history to: ' + users[i]._id);

            newHistory = new UserHistory();
            newHistory.save(function (err) {
              if (err) { return cb(err); }

              users[i].history = newHistory;
              users[i].save(function() {
                if (err) { return cb(err); }

                i += 1;
                cb();
              });
            });
          }
        }
      , cb);
    });
  }

  // Check that all users have a UserHistory now
, function (cb) {
    User.find({ history: undefined }, function(err, users) {
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
      console.log("Closed connection to database");
      process.exit(0);
    });
  }
);
