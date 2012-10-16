/*
 * This migration was necessary once we defined the new required field 'hostname' on tldr
 * We set it to 0 for all users
 * Date: 09/10/2012
 *
 */

var async = require('async')
  , _ = require('underscore')
  , models = require('../lib/models')
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

  // Add the notificationsSettings field to all users
, function (cb) {
    var i = 0;

    console.log('Adding and populating the notificationsSettings field to the User schema');

    User.find({}, function(err, users) {
      if (err) { return cb(err); }

      async.whilst(
        function () { return i < users.length; }
      , function (cb) {
          console.log('Adding notificationsSettings to: ' + users[i]._id);

          users[i].notificationsSettings = { edit: true, like: true, read: true };

          users[i].save(function(err) {
            if (err) { return cb(err); }

            i += 1;
            cb();
          });
        }
      , cb);
    });
  }
  // test that all the users docs have a hostname field
, function (cb) {
    User.find({ notificationsSettings: { $exists: false } }, function(err, users) {
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
