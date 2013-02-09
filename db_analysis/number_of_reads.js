#!/usr/local/bin/node

/*
 * Calculate the total number of reads
 *
 */

var async = require('async')
  , _ = require('underscore')
  , models = require('../lib/models')
  , Tldr = models.Tldr
  , User = models.User
  , DbObject = require('../lib/db')
  , config = require('../lib/config')
  , customUtils = require('../lib/customUtils')
  , result = 0
  , db = new DbObject( config.dbHost
                     , config.dbName
                     , config.dbPort
                     );

db.connectToDatabase(function () {
  Tldr.find({}, function (err, tldrs) {
    _.each(tldrs, function (tldr) {
      result += tldr.readCount;
    });

    console.log("=== We are " + new Date() + " and the read count is: " + result);
    process.exit(0);
  });
});
