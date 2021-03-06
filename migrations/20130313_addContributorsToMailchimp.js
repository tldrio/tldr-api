/*
 * Date: 26/09/2012
 *
 */

var async = require('async')
  , _ = require('underscore')
  , models = require('../lib/models')
  , User = models.User
  , DbObject = require('../lib/db')
  , config = require('../lib/config')
  , mailChimpSync = require('../lib/mailchimpSync')
  , db = new DbObject( config.dbHost
                     , config.dbName
                     , config.dbPort
                     )
  , j = 0
  ;

console.log('===== Beginning migration =====');
console.log('Connecting to DB ' + config.dbHost + ':' + config.dbPort + '/' + config.dbName)

async.waterfall([
  function (cb) {
    db.connectToDatabase(function() {
      console.log('Connected');
      cb();
    });
  }

, function (cb) {
    var i = 0;

    User.find({}).exec(function(err, users) {
      if (err) { return cb(err); }

      async.whilst(
        function () { return i < users.length; }
      , function (cb) {
          if (users[i].tldrsCreated && users[i].tldrsCreated.length >= 1) {
            mailChimpSync.updateGroupForUser({ email: users[i].email
                                             , groupName: 'Contributors'
                                             , userBelongsToGroup: true
                                             });

            i += 1;
	j+=1;
            setTimeout(cb, 500);
          } else {
            i += 1;
            cb();
          }
        }
      , cb);
    });
  }
], function (err) {
    if (err) {
      console.log('Something unexpected occured, stopped migration. ', err);
    }

console.log("Sent for " + j);
    console.log("Wait 5s to be sure sync is complete");

    setTimeout(function () {
      db.closeDatabaseConnection(function () {
        console.log("Closed connection to database");
        process.exit(0);
      });
    }, 5000);
  }
);
