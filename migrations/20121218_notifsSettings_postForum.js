/*
 * Date: 12/18/2012
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

    console.log('Adding postForum options to notificationsSettings ');

    User.find({}, function(err, users) {
      if (err) { return cb(err); }

      async.whilst(
        function () { return i < users.length; }
      , function (cb) {

          var prevSettings = users[i].notificationsSettings
            , newSettings = _.extend({}, prevSettings, { postForum: true });
          users[i].notificationsSettings = newSettings;
          console.log('Adding postForum to: ' + users[i]._id);

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
    User.find({ "notificationsSettings.postForum": { $exists: false } }, function(err, users) {
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
