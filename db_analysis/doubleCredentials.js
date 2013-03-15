/*
 * Get the names email addresses of our active users
 *
 */

var async = require('async')
  , _ = require('underscore')
  , models = require('../lib/models')
  , Tldr = models.Tldr
  , User = models.User
  , Credentials = models.Credentials
  , DbObject = require('../lib/db')
  , config = require('../lib/config')
  , customUtils = require('../lib/customUtils')
  , db = new DbObject( config.dbHost
                     , config.dbName
                     , config.dbPort
                     )
  , j = 0
  , doublesFound = 0
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

      async.whilst( function () { return j < users.length; }
      , function (_cb) {
          var user = users[j];
          j += 1;
          Credentials.findOne({ type: 'basic', login: user.email }, function (err, bc) {
            Credentials.findOne({ type: 'google', googleEmail: user.email }, function (err, gc) {
              if (bc && gc) {
                doublesFound += 1;
                console.log(user.email);
              }
              return _cb();
            });
          });
        }
      , cb);

    });
  }
], function (err) {
    console.log("Non confirmed " + j);
console.log("Doubles " + doublesFound);
    db.closeDatabaseConnection(function () {
      console.log('Closed connection to database');
      process.exit(0);
    });
  }
);

