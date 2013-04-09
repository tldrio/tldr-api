/*
 * Reset the database by removing everything except the API clients
 * Date: 09/10/2012
 *
 */

var async = require('async')
  , APIClient = require('../models/apiClientModel')
  , models = require('../lib/models')
  , User = models.User
  , Tldr = models.Tldr
  , UserAnalytics = models.UserAnalytics
  , Topic = models.Topic
  , mongoose = require('mongoose')
  , DbObject = require('../lib/db')
  , config = require('../lib/config')
  , customUtils = require('../lib/customUtils')
  , urlNormalization = require('../lib/urlNormalization')
  , louis, tldr1, tldr2, tldr3, tldr4
  , now = new Date()
  , oneday = 24 * 3600 * 1000
  , mqClient = require('../lib/message-queue')
  , db = new DbObject( config.dbHost
                     , config.dbName
                     , config.dbPort
                     )
  , noAnalytics = process.argv.indexOf('--no-analytics') !== -1
  ;


function wait (delay, cb) {
  setTimeout(cb, delay);
}

function putCurrentAnalyticsBackInTime (days, cb) {
  var oldTimestamp = customUtils.getDayResolution(now)
    , newTimestamp = new Date(oldTimestamp.getTime() - days * oneday)

  if (noAnalytics) { return cb(); }
  UserAnalytics.daily.update( { timestamp: oldTimestamp, user: louis._id }
                            , { timestamp: newTimestamp }
                            , { multi: false }
                            , function (err) { return cb(err); });
}

if (process.env.NODE_ENV) {
  console.log("I won't run this on anything other than local databases :P");
  process.exit(0);
}

async.waterfall([
  function (cb) {
    db.connectToDatabase(function() {
      console.log('Connected');
      cb();
    });
  }
, function (cb) {
    console.log("Dropping database");
    mongoose.connection.db.dropDatabase(function (err, done) {
      cb(err);
    });
  }
, function (cb) {
    var bmLocal = { name: 'bm-local', key: 'fF5TVeCAlTqsLjEpNCb9', isOfficial: true }
      , crxLocal = { name: 'chrome-ext-local', key: 'JjlZcfAW8NMFWXSCIeiz', isOfficial: true }
      , xpiLocal = { name: 'firefox-ext-local', key: 'VkLGTWnKPMWQhDkvtDBz', isOfficial: true }
      ;

    console.log("Recreating the two local clients");
    APIClient.createAndSaveInstance(bmLocal, function (err, apic) {
      APIClient.createAndSaveInstance(crxLocal, function (err, apic) {
        APIClient.createAndSaveInstance(xpiLocal, function (err, apic) {
          cb();
        });
      });
    });
  }
, function (cb) {
    console.log("Creating some categories");
    Topic.createAndSaveInstance({ type: 'category', name: 'Startups' }, function () {
      Topic.createAndSaveInstance({ type: 'category', name: 'Art' }, function () {
        Topic.createAndSaveInstance({ type: 'category', name: 'Programming' }, function () {
          cb();
        });
      });
    });
  }
, function (cb) {
    var _louis = { username: 'Louis', email: 'louis.chatriot@gmail.com', password: 'internet' }
      , _stan = { username: 'Stan', email: 'stanislas.marion@gmail.com', password: 'internet' }
      , _charles = { username: 'Charles', email: 'charles.miglietti@gmail.com', password: 'internet' }
      ;

    console.log("Recreating three fake accounts");
    User.createAndSaveInstance(_louis, function (err, __louis) {
      louis = __louis;
      User.createAndSaveInstance(_stan, function (err, __stan) {
        User.createAndSaveInstance(_charles, function (err, __charles) {
          User.update({ _id: { $in: [ __louis._id, __stan._id, __charles._id ] } }, { $set: { confirmedEmail: true } }, { multi: true }, function () {
            cb();
          });
        });
      });
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
, function (cb) {
    var tldrData1 = {url: 'http://www.nytimes.com/2013/03/06/opinion/the-country-that-stopped-reading.html', language: { language: 'en', confidence: 1}, categories: 'Startups', articleWordCount: 400, title:'nutcrackers', summaryBullets: ['Awesome Blog'], resourceAuthor: 'Charles' }
      , tldrData2 = {url: 'http://www.avc.com/a_vc/2013/03/why-the-unlocking-phones-debate-is-important.html', language: { language: 'en', confidence: 1}, categories: 'Startups', articleWordCount: 500, title:'mba-monday', summaryBullets: ['Fred Wilson is my God'], resourceAuthor: 'Fred' }
      , tldrData3 = {url: 'http://bothsidesofthetable.com/deflationnary-economics', categories: 'Startups', language: { language: 'en', confidence: 1}, articleWordCount: 700, title: 'deflationary economics', summaryBullets: ['Sustering is my religion'], resourceAuthor: 'Mark' }
      ;

    console.log("Creating three tldrs");
    Tldr.createAndSaveInstance(tldrData1, louis, function (err, _tldr1) {
      if (err) { return cb(err); }
      tldr1 = _tldr1;
      Tldr.createAndSaveInstance(tldrData2, louis, function (err, _tldr2) {
        if (err) { return cb(err); }
        tldr2 = _tldr2;
        Tldr.createAndSaveInstance(tldrData3, louis, function (err, _tldr3) {
          if (err) { return cb(err); }
          tldr3 = _tldr3;
          return cb();
        });
      });
    });
  }
, function (cb) {
    if (noAnalytics) { return cb(); }
    console.log("Faking some analytics");
    mqClient.emit('tldr.read', { tldr: tldr1 });
    mqClient.emit('tldr.read', { tldr: tldr1 });
    mqClient.emit('tldr.read', { tldr: tldr3 });
    mqClient.emit('tldr.read', { tldr: tldr3 });
    mqClient.emit('tldr.read', { tldr: tldr3 });
    mqClient.emit('tldr.read', { tldr: tldr3 });
    mqClient.emit('tldr.read', { tldr: tldr2 });
    cb();
  }
, async.apply(wait, 50)
, async.apply(putCurrentAnalyticsBackInTime, 5)
, function (cb) {
    if (noAnalytics) { return cb(); }
    console.log("Faking some analytics");
    mqClient.emit('tldr.read', { tldr: tldr3 });
    mqClient.emit('tldr.read', { tldr: tldr3 });
    cb();
  }
, async.apply(wait, 50)
, async.apply(putCurrentAnalyticsBackInTime, 4)
, function (cb) {
    if (noAnalytics) { return cb(); }
    console.log("Faking some analytics");
    mqClient.emit('tldr.read', { tldr: tldr2 });
    mqClient.emit('tldr.read', { tldr: tldr1 });
    mqClient.emit('tldr.read', { tldr: tldr1 });
    mqClient.emit('tldr.read', { tldr: tldr1 });
    cb();
  }
, async.apply(wait, 50)
, async.apply(putCurrentAnalyticsBackInTime, 6)
, function (cb) {
    if (noAnalytics) { return cb(); }
    console.log("Faking some analytics");
    mqClient.emit('tldr.read', { tldr: tldr3 });
    mqClient.emit('tldr.read', { tldr: tldr3 });
    mqClient.emit('tldr.read', { tldr: tldr3 });
    mqClient.emit('tldr.read', { tldr: tldr1 });
    mqClient.emit('tldr.thank', { tldr: tldr2 });
    cb();
  }
, async.apply(wait, 50)
, async.apply(putCurrentAnalyticsBackInTime, 7)
, function (cb) {
    if (noAnalytics) { return cb(); }
    console.log("Faking some analytics");
    mqClient.emit('tldr.read', { tldr: tldr2 });
    mqClient.emit('tldr.read', { tldr: tldr2 });
    mqClient.emit('tldr.read', { tldr: tldr2 });
    cb();
  }
, async.apply(wait, 50)
, async.apply(putCurrentAnalyticsBackInTime, 34)
, function (cb) {
    if (noAnalytics) { return cb(); }
    console.log("Faking some analytics");
    mqClient.emit('tldr.read', { tldr: tldr3 });
    mqClient.emit('tldr.read', { tldr: tldr3 });
    mqClient.emit('tldr.read', { tldr: tldr3 });
    mqClient.emit('tldr.read', { tldr: tldr3 });
    mqClient.emit('tldr.read', { tldr: tldr3 });
    mqClient.emit('tldr.thank', { tldr: tldr1 });
    mqClient.emit('tldr.thank', { tldr: tldr1 });
    cb();
  }
, async.apply(wait, 50)
, async.apply(putCurrentAnalyticsBackInTime, 33)
, function (cb) {
    var tldrData4 = {url: 'http://blog.eladgil.com/2013/02/should-you-hire-coo.html', categories: 'Art', articleWordCount: 7456, title:'nutcrackers', summaryBullets: ['Awesome Blog'], resourceAuthor: 'Charles' }
      ;

    if (noAnalytics) { return cb(); }
    console.log("Creating another tldr");
    Tldr.createAndSaveInstance(tldrData4, louis, function (err, _tldr4) {
      if (err) { return cb(err); }
      tldr4 = _tldr4;
      return cb();
    });
  }
, async.apply(wait, 50)
, async.apply(putCurrentAnalyticsBackInTime, 35)
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

