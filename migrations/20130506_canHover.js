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

    console.log('Adding lastWalledHover field necessary for hover control');

    User.find({ deleted: false }, function(err, users) {
      if (err) { return cb(err); }

      async.each(
        users
      , function (user, cb) {
          user.lastWalledHover = Date.now();
          console.log('Adding field for: ' + user._id);
          user.save(function(err) {
            if (err) { return cb(err); }
            cb();
          });
        }
      , cb);
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
