/*
 * Get the DAU for the last 24 hours and the MAU for the last 30 days
 *
 */

var async = require('async')
  , _ = require('underscore')
  , models = require('../lib/models')
  , Notification = models.Notification
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
, function (callback) {
    var DAU = 0, MAU = 0, i = 0;

    User.find({}, function (err, users) {
      if (err) { return cb(err); }

      async.whilst(
        function () { return i < users.length; }
      , function (cb) {
          var user = users[i]
            , after1d = new Date(new Date() - 24 * 3600 * 1000)
            , after30d = new Date(new Date() - 30 * 24 * 3600 * 1000)
            ;
          i += 1;

          Notification.count({ type: 'read', to: user._id, createdAt: { $gt: after1d } }, function (err, notifs) {
            DAU += notifs > 0 ? 1 : 0;
            Notification.count({ type: 'read', to: user._id, createdAt: { $gt: after30d } }, function (err, notifs) {
              MAU += notifs > 0 ? 1 : 0;
              cb();
            });
          });
        }
      , function () {
          console.log("DAU: " + DAU);
          console.log("MAU: " + MAU);
          console.log("DAU/MAU: " + (DAU / MAU));
          callback();
        });
    });
  }
], function (err) {
    db.closeDatabaseConnection(function () {
      console.log('Closed connection to database');
      process.exit(0);
    });
  }
);


