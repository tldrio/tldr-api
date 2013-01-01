/**
 * Script to create the latest version of the sitemap
 * The sitemap file shouldn't exceed 50MB and 50,000 urls
 * If it does we must create a sitemap index.
 */

var fs = require('fs')
  , async = require('async')
  , _ = require('underscore')
  , config = require('../lib/config')
  , DbObject = require('../lib/db')
  , db = new DbObject(config.dbHost, config.dbName, config.dbPort)
  , models = require('../lib/models')
  , Tldr = models.Tldr
  , User = models.User
  , writeStream = fs.createWriteStream('./sitemap.xml')
  , before = fs.readFileSync('./sitemap.before.xml', 'utf8')
  , after = fs.readFileSync('./sitemap.after.xml', 'utf8')
  ;

// Add an url to the sitemap represented by writeStream ws
function addUrlToMap(ws, url, changefreq, priority) {
  ws.write('<url>\n');
  ws.write('<loc>' + url + '</loc>\n', 'utf8');
  ws.write('<changefreq>' + changefreq + '</changefreq>\n', 'utf8');
  ws.write('<priority>' + priority + '</priority>\n', 'utf8');
  ws.write('</url>\n\n');
}

async.waterfall([
  function (cb) {
    writeStream.write(before, 'utf8');
    writeStream.write("\n", 'utf8');
    db.connectToDatabase(cb);
  }
, function (cb) {
    Tldr.find({}, function (err, tldrs) {
      _.each(tldrs, function (tldr) {
        addUrlToMap(writeStream, 'http://tldr.io/tldrs/' + tldr.slug, 'monthly', '0.3');
      });
      cb();
    });
  }
, function (cb) {
    writeStream.write(after, 'utf8');
    writeStream.write("\n", 'utf8');
    writeStream.end();
    cb();
  }
], function (err) {
     if (err) {
       console.log('An error occured', err);
     } else {
       console.log('Sitemap created successfully');
     }

     process.exit(0);
   });
