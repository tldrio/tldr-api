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
  ;


async.waterfall([
  function (cb) {
    db.connectToDatabase(function() {
      console.log('Connected');
      cb();
    });
  }
, function (cb) {
    var res = 0;

    Tldr.find({}, 'readCount articleWordCount', function (err, tldrs) {
      tldrs.forEach(function (tldr) {
        res += tldr.readCount * tldr.articleWordCount;
      });

      console.log("Total article word count: " + res);
      cb();
    });
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

