var async = require('async')
  , _ = require('underscore')
  , models = require('../lib/models')
  , Topic = models.Topic
  , Tldr = models.Tldr
  , domainNames = [ 'blog.device42.com'
                  , 'mattcutts.com'
                  , 'myclean.com'
                  , 'exoa.net'
                  , 'qz.com'
                  , 'venturebeat.com'
                  , 'reprog.wordpress.com'
                  , 'codetunes.com'
                  , 'speckyboy.com'
                  , 'rackspace.com'
                  , 'hosted.ap.org'
                  , 'boondainc.wordpress.com'
                  , 'inkdit.com'
                  , 'lifehack.org'
                  , 'blogs.smithsonianmag.com'
                  , 'techcrunch.com'
                  , 'arstechnica.com'
                  , 'en.blog.wordpress.com'
                  , 'mathieu.fenniak.net'
                  ]
  , DbObject = require('../lib/db')
  , config = require('../lib/config')
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
    async.each( domainNames
    , function (domainName, _cb) {
      Tldr.renormalizeDomain({ domainName: domainName, hard: true }, _cb);
    }
    , cb);
  }

], function (err) {
    if (err) {
      console.log('Something unexpected occured, stopped migration. ', err);
    }

    db.closeDatabaseConnection(function () {
      console.log("Closed connection to database");
      process.exit(0);
    });
  }
);
