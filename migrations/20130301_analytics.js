/*
 * Populate the base with some analytics
 */

var async = require('async')
  , _ = require('underscore')
  , models = require('../lib/models')
  , customUtils = require('../lib/customUtils')
  , Tldr = models.Tldr
  , analytics = require('../models/analytics')
  , mqClient = require('../lib/message-queue')
  , DbObject = require('../lib/db')
  , config = require('../lib/config')
  , sinon = require('sinon')
  , clock
  , now = new Date()
  , blockingWait
  , db = new DbObject( config.dbHost
                     , config.dbName
                     , config.dbPort
                     );

console.log('===== Beginning migration =====');
console.log('Connecting to DB ' + config.dbHost + ':' + config.dbPort + '/' + config.dbName)

function setFakeTime (date) {
  var fakeNow = new Date()
    , toTick = date.getTime() - fakeNow.getTime();

  clock.tick(toTick);
}

blockingWait = (function (realDate) {
  return function (delay, cb) {
    var now = new realDate();

    while ((new realDate()).getTime() < now.getTime() + delay) {}
    if (cb) { return cb(); }
  };
})(Date);


async.waterfall([
  function (cb) {
    db.connectToDatabase(function() {
      console.log('Connected');
      clock = sinon.useFakeTimers(now.getTime());

      cb();
    });
  }

  // Replay the tldrs creations
, function (cb) {
    var i = 0, errorCount = 0;

    Tldr.find({}, function(err, tldrs) {
      if (err) { return cb(err); }

      async.whilst(
        function () { return i < tldrs.length; }
      , function (_cb) {
          console.log('Recreate analytics for: ' + tldrs[i]._id);

          var tldr = tldrs[i];

          setFakeTime(tldr.createdAt);
          analytics.replayTldrsCreation(tldr, function (err) {
            if (err) { return _cb(err); }

            i += 1;
            return _cb();
          });
        }
      , cb);
    });
  }



], function (err) {
    if (err) {
      console.log('Something unexpected occured, stopped migration. ', err);
    }

    console.log(now);
    clock.restore();
    db.closeDatabaseConnection(function () {
      console.log("Closed connection to database");
      process.exit(0);
    });
  }
);
