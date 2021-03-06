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

function repartition (number, beginDate, maxRecursion) {
  var stop = now.getTime() <= beginDate.getTime() + 24 * 3600 * 1000
    , res = [], factor = (60 + Math.floor(10 * Math.random())) / 100
    , tail
    ;

  maxRecursion = maxRecursion || 5;   // Everything happens it at most 5 days
  if (stop || maxRecursion === 1 || number <= 3) { return [number]; }

  res[0] = Math.floor(factor * number);
  tail = repartition(number - res[0], new Date(beginDate.getTime() + 24 * 3600 * 1000), maxRecursion - 1);
  res = res.concat(tail);
  return res;
}


function executeMultipleTimes (f, n, cb) {
  var i = 0;

  async.whilst(function () { return i < n; }
  , function (_cb) { i += 1; f(_cb); }
  , cb);
}



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
          console.log('Replay creation for: ' + tldrs[i]._id);

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

  // Replay thanks
, function (cb) {
    var i = 0, errorCount = 0;

    Tldr.find({}, function(err, tldrs) {
      if (err) { return cb(err); }

      async.whilst(
        function () { return i < tldrs.length; }
      , function (_cb) {
          console.log('Replay thanking for: ' + tldrs[i]._id);

          var tldr = tldrs[i]
            , repartitionTable = repartition(tldr.thankedBy.length, tldr.createdAt)
            , j = 0
            ;

          setFakeTime(tldr.createdAt);

          // Execute multiple times according to repartition table
          async.whilst(function () { return j < repartitionTable.length; }
          , function (cbtable) {
              executeMultipleTimes(
                function (cbi) {
                  analytics.replayThanks(tldr, function (err) { cbi(err); })
                }
              , repartitionTable[j]
              , function () {
                  j += 1;
                  clock.tick(24 * 3600 * 1000);
                  return cbtable();
              });
            }
          , function () { i += 1; _cb(); }
          );
          // End of executing table
        }
      , cb);
    });
  }

  // Replay reads
, function (cb) {
    var i = 0, errorCount = 0;

    Tldr.find({}, function(err, tldrs) {
      if (err) { return cb(err); }

      async.whilst(
        function () { return i < tldrs.length; }
      , function (_cb) {
          console.log('Replay reads for: ' + tldrs[i]._id);

          var tldr = tldrs[i]
            , repartitionTable = repartition(tldr.readCount, tldr.createdAt)
            , j = 0
            ;

          setFakeTime(tldr.createdAt);

          // Execute multiple times according to repartition table
          async.whilst(function () { return j < repartitionTable.length; }
          , function (cbtable) {
              executeMultipleTimes(
                function (cbi) {
                  analytics.replayRead(tldr, function (err) { cbi(err); })
                }
              , repartitionTable[j]
              , function () {
                  j += 1;
                  clock.tick(24 * 3600 * 1000);
                  return cbtable();
              });
            }
          , function () { i += 1; _cb(); }
          );
          // End of executing table
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
