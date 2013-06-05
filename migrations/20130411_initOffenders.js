/*
 * Reset the database by removing everything except the API clients
 * Date: 09/10/2012
 *
 */

var async = require('async')
  , mongoose = require('mongoose')
  , DbObject = require('../lib/db')
  , config = require('../lib/config')
  , urlNormalization = require('../lib/urlNormalization')
  , louis, tldr1, tldr2, tldr3, tldr4
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
    // The state of the querystring offenders before we switched to a DB-backed solution
    var defaultQuerystringOffenders = [
      'youtube.com'
    , 'spacex.com'
    , 'groklaw.net'
    , 'blog.tanyakhovanova.com'
    , 'news.ycombinator.com'
    , 'bennjordan.com'
    , 'aarongreenspan.com'
    , 'play.google.com'
    , 'network-tools.com'
    , 'mcahogarth.org'
    , 'dendory.net'
    , 'datacenteracceleration.com'
    , 'code.google.com'
    , 'symbo1ics.com'
    , 'chartjs.org'
    , 'us2.campaign-archive1.com'
    , 'universityventuresfund.com'
    , 'youell.com'
    ]
    , qso = new urlNormalization.QuerystringOffenders();

    console.log("Initializing the querystring offenders in database");
    async.each(defaultQuerystringOffenders, function (item, _cb) {
      qso.addDomainToCacheAndDatabase(item, _cb)
    }, cb);
  }
], function (err) {
    if (err) {
      console.log("Some error occured!");
      console.log(err);
    }
    db.closeDatabaseConnection(function () {
      console.log('Closed connection to database');
      process.exit(0);
    });
  }
);


