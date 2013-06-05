var async = require('async')
  , _ = require('underscore')
  , models = require('../lib/models')
  , User = models.User
  , Credentials = models.Credentials
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

, function (cb) {
    var i = 0;

    Credentials.find({ type: 'google' })
               .populate('owner')
               .exec(function(err, gcs) {
      if (err) { return cb(err); }

      async.whilst(
        function () { return i < gcs.length; }
      , function (_cb) {
          gcs[i].owner.confirmedEmail = true;
          gcs[i].owner.confirmEmailToken = null;
          console.log('Confirming: ' + gcs[i].owner._id);

          gcs[i].owner.save(function(err) {
            if (err) { return cb(err); }

            i += 1;
            _cb();
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
