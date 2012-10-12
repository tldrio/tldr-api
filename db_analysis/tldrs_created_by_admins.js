/*
 * This migration was necessary once we defined the new required field 'hostname' on tldr
 * We set it to 0 for all tldrs
 * Date: 09/10/2012
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
  , db = new DbObject( config.dbHost
                     , config.dbName
                     , config.dbPort
                     );

var adminTldrsBetweenDates = function (begin, end, cb) {
    var admins = 0, nonAdmins = 0;

    Tldr.find({})
        .populate('creator')
        .exec(function(err, tldrs) {
          if (err) { return cb(err); }

          _.each(tldrs, function(tldr) {
            if (tldr.creator.isAdmin()) {
              admins += 1;
            } else {
              nonAdmins += 1;
            }
          });

          console.log("=======================");
          console.log("Begin: ", begin)
          console.log("End: ", end)
          console.log("ADMINS: ", admins);
          console.log("NON ADMINS: ", nonAdmins);

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

  // Add the hostname field to all tldr docs
, async.apply(adminTldrsBetweenDates, new Date(2012, 8, 17, 0, 0, 0), new Date(2012, 8, 23, 23, 59, 59))
, async.apply(adminTldrsBetweenDates, new Date(2012, 8, 24, 0, 0, 0), new Date(2012, 8, 30, 23, 59, 59))
, async.apply(adminTldrsBetweenDates, new Date(2012, 9, 1, 0, 0, 0), new Date(2012, 9, 7, 23, 59, 59))
, async.apply(adminTldrsBetweenDates, new Date(2012, 9, 8, 0, 0, 0), new Date(2012, 9, 14, 23, 59, 59))
], function (err) {
    db.closeDatabaseConnection(function () {
      console.log('Closed connection to database');
      process.exit(0);
    });
  }
);
