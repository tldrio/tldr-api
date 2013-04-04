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

    console.log('Changing default avatar');

    User.find({}, function(err, users) {
      if (err) { return cb(err); }

      async.whilst(
        function () { return i < users.length; }
      , function (cb) {

          var prevUrl = users[i].gravatar.url
            , matches = prevUrl.match(/(.*)wavatar/);
          if (matches && matches.length >= 2) {
            users[i].gravatar.url = matches[1] + 'retro';
            console.log('CHanging gravatar for: ' + users[i]._id);

            users[i].save(function(err) {
              if (err) { return cb(err); }

              i += 1;
              cb();
            });
          } else {
            console.log('WTF no wavatar?');
            cb('WTF no wavatar');
          }

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
