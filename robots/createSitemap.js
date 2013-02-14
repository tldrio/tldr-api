#! /usr/local/bin/node

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
  , Topic = models.Topic
  , writeStream, before, after
  , numberOfUrls = 5   // There are 5 static urls we want google to crawl
  ;

console.log("Rebuilding the sitemap: " + new Date());
process.chdir(process.env.TLDR_API_DIR);

writeStream = fs.createWriteStream('./robots/sitemaps/sitemap.xml')
before = fs.readFileSync('./robots/sitemap.before.xml', 'utf8')
after = fs.readFileSync('./robots/sitemap.after.xml', 'utf8')

// Add an url to the sitemap represented by writeStream ws
function addUrlToMap(ws, url, changefreq, priority) {
  ws.write('<url>\n');
  ws.write('<loc>' + url + '</loc>\n', 'utf8');
  ws.write('<changefreq>' + changefreq + '</changefreq>\n', 'utf8');
  ws.write('<priority>' + priority + '</priority>\n', 'utf8');
  ws.write('</url>\n\n');

  numberOfUrls += 1;
}

async.waterfall([
  function (cb) {
    writeStream.write(before, 'utf8');
    writeStream.write("\n", 'utf8');
    db.connectToDatabase(cb);
  }
, function (cb) {   // Add tldr pages
    Tldr.find({}, function (err, tldrs) {
      _.each(tldrs, function (tldr) {
console.log(tldr._id + ' - ' + tldr.slug);

        addUrlToMap(writeStream, 'http://tldr.io/tldrs/' + tldr._id + '/' + tldr.slug, 'monthly', '0.5');
      });
      cb();
    });
  }
, function (cb) {   // Add user public profiles
    User.find({}, function (err, users) {
      _.each(users, function (user) {
        addUrlToMap(writeStream, 'http://tldr.io/' + user.username, 'daily', '0.4');
      });
      cb();
    });
  }
, function (cb) {   // Add topics
    Topic.find({}, function (err, topics) {
      _.each(topics, function (topic) {
        addUrlToMap(writeStream, 'http://tldr.io/forum/topics/' + topic._id + '/' + topic.slug, 'weekly', '0.2');
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
     } else {
       console.log('Sitemap created successfully, ' + numberOfUrls + ' urls added');
     }

     process.exit(0);
   });
