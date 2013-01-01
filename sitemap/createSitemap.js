/**
 * Script to create the latest version of the sitemap
 * The sitemap file shouldn't exceed 50MB and 50,000 urls
 * If it does we must create a sitemap index.
 */

var fs = require('fs')
  , async = require('async')
  , config = require('../lib/config')
  , DbObject = require('../lib/db')
  , db = new DbObject(config.dbHost, config.dbName, config.dbPort)
  , Tldr = require('../models/tldrModel')
  //, models = require('../lib/models')
  //, Tldr = models.Tldr
  //, User = models.User
  , writeStream = fs.createWriteStream('./sitemap.xml')
  , before = fs.readFileSync('./sitemap.before.xml', 'utf8')
  , after = fs.readFileSync('./sitemap.after.xml', 'utf8')
  ;


writeStream.write(before, 'utf8');
writeStream.write("\n", 'utf8');
writeStream.write(after, 'utf8');
writeStream.write("\n", 'utf8');

writeStream.end();

config.session.store.client.quit();
