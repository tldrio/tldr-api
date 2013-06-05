/*
 * Going to the credentials system
 * Date: 26/09/2012
 */

var async = require('async')
  , _ = require('underscore')
  , models = require('../lib/models')
  , User = models.User
  , Credentials = models.Credentials
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

    User.find({ password: { $exists: true } }, function(err, users) {
      if (err) { return cb(err); }

      async.whilst(
        function () { return i < users.length; }
      , function (cb) {
          var user = users[i]
            , bc = new Credentials({ type: 'basic'
                                   , owner: user._id
                                   , login: user.email
                                   , password: user.toObject().password
                                   })
              ;

          console.log('Credentializing: ' + user._id);
          i += 1;

          bc.save(function (err, bc) {
            if (err) { return cb(err); }

            delete user.password;
            user.attachCredentialsToProfile(bc, function (err) {
              cb(err);
            });
          });
        }
      , cb);
    });
  }
], function (err) {
    if (err) { console.log('Something unexpected occured, stopped migration. ', err); }

    db.closeDatabaseConnection(function () {
      console.log("Closed connection to database");
      process.exit(0);
    });
  }
);
