#! /usr/local/bin/node

/**
 * Script to create the latest version of 'Latest Summaries' RSS feed
 * It will contain the 30 latest tldrs
 */

var fs = require('fs')
  , async = require('async')
  , _ = require('underscore')
  , config = require('../lib/config')
  , DbObject = require('../lib/db')
  , db = new DbObject(config.dbHost, config.dbName, config.dbPort)
  , models = require('../lib/models')
  , Tldr = models.Tldr
  , writeStream, before, after
  , h4e = require('h4e')
  ;

console.log("Rebuilding the 'Latest Summaries' RSS feed: " + new Date());
process.chdir(process.env.TLDR_API_DIR);

writeStream = fs.createWriteStream('./rss/feeds/latest-summaries.xml')
before = fs.readFileSync('./rss/latest-summaries.before.xml', 'utf8')
after = fs.readFileSync('./rss/latest-summaries.after.xml', 'utf8')

h4e.setup({ extension: 'mustache'
          , baseDir: 'rss'
          , toCompile: ['.'] });

// Add an item to the RSS feed
function addTldrToFeed(ws, tldr) {
  tldr.pubDate = tldr.createdAt.toUTCString();

  ws.write(h4e.render('item', { values: tldr }));
}

async.waterfall([
  function (cb) {
    writeStream.write(before, 'utf8');
    writeStream.write("\n", 'utf8');
    db.connectToDatabase(cb);
  }
, function (cb) {   // Add tldr pages
    Tldr.find({ moderated: true, discoverable: true })
        .sort('-createdAt')
        .limit(50)
        .populate('creator', 'username')
        .exec(function (err, tldrs) {
          _.each(tldrs, function (tldr) {
            addTldrToFeed(writeStream, tldr);
          });
          cb();
        });
  }
, function (cb) {
    writeStream.write(after, 'utf8');
    writeStream.write("\n", 'utf8');

    // Can only call the callback when the write stream is indeed closed
    writeStream.on('close', function () {
      console.log('Write stream now closed');
      cb();
    });

    writeStream.end();
  }
], function (err) {
     if (err) {
       console.log('An error occured', err);
       process.exit(1);
     } else {
       console.log("'Latest summaries' RSS feed successfully created");
       process.exit(0);
     }
   });
