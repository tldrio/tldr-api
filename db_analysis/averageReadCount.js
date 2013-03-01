var async = require('async')
  , Tldr = require('../models/tldrModel')
  , mongoose = require('mongoose')
  , DbObject = require('../lib/db')
  , config = require('../lib/config')
  , _ = require('underscore')
  , db = new DbObject( config.dbHost
                     , config.dbName
                     , config.dbPort
                     )
  , weeksBack = process.argv[2] || 1
  , oneWeek = 7 * 24 * 3600 * 1000
  , now = new Date()
  ;


function getAverageReadCount (beg, end, cb) {
  Tldr.find({ createdAt: { $gte: beg, $lte: end } }, 'readCount', function (err, tldrs) {
    if (err) { return cb(err); }

    console.log("================================================================");
    console.log("Average read count for tldrs created between " + beg + " and " + end);
    if (tldrs.length > 0 ) {
      console.log(_.reduce(tldrs, function (memo, item) { return memo + item.readCount; }, 0) / tldrs.length);
    } else {
      console.log("No data available for this period");
    }
    cb();
  });
}




async.waterfall([
  function (cb) {
    db.connectToDatabase(function() {
      console.log('Connected');
      cb();
    });
  }
, function (cb) {
    var i = weeksBack;

    async.whilst( function () { return i >= 1; }
    , function (_cb) {
       var beg = new Date(now.getTime() - oneWeek * (i + 1))
         , end = new Date(now.getTime() - oneWeek * i)
         ;

       i -= 1;
       getAverageReadCount( beg
                          , end
                          , _cb);
     }
   , cb);
  }
], function (err) {
    if (err) {
      console.log("An error occured");
      console.log(err);
    }

    db.closeDatabaseConnection(function () {
      console.log('Closed connection to database');
      process.exit(0);
    });
  }
);

