var should = require('chai').should()
  , assert = require('chai').assert
  , _ = require('underscore')
  , i18n = require('../lib/i18n')
  , sinon = require('sinon')
  , mongoose = require('mongoose') // ODM for Mongo
  , models = require('../lib/models')
  , User = models.User
  , Tldr = models.Tldr
  , Credentials = models.Credentials
  , Event = models.Event
  , TldrAnalytics = models.TldrAnalytics
  , UserAnalytics = models.UserAnalytics
  , EmbedAnalytics = models.EmbedAnalytics
  , RSSAnalytics = models.RSSAnalytics
  , TwitterAnalytics = require('../models/analytics').TwitterAnalytics
  , config = require('../lib/config')
  , mqClient = require('../lib/message-queue')
  , DbObject = require('../lib/db')
  , db = new DbObject(config.dbHost, config.dbName, config.dbPort)
  , async = require('async')
  , tldrsWithRedirectedUrls = require('../lib/tldrsWithRedirectedUrls')
  , clock
  , fakeNow = new Date(2005, 6, 15, 14, 30, 30, 500)
  , dayNow = new Date(2005, 6, 15)
  , tomorrow = new Date(2005, 6, 16)
  , monthNow = new Date(2005, 6, 1)
  , nextMonth = new Date(2005, 7, 1)
  ;



describe.only('Tldr with redirected urls', function () {

  var user, userbis, tldr1, tldr2, tldr3;

  before(function (done) {
    db.connectToDatabase(done);
  });

  after(function (done) {
    db.closeDatabaseConnection(done);
  });

  beforeEach(function (done) {
    var tldrData1 = {url: 'http://needforair.com/nutcrackers', articleWordCount: 400, title:'nutcrackers', summaryBullets: ['Awesome Blog'], resourceAuthor: 'Charles' }
      , tldrData2 = {url: 'http://yes.com/article', title:'mba-monday', articleWordCount: 500, summaryBullets: ['Fred Wilson is my God'], resourceAuthor: 'Fred' }
      , tldrData3 = {url: 'http://avc.com/mba-monday/tuesday', title:'mba-mondaddy', articleWordCount: 700, summaryBullets: ['Fred Wilson is my God'], resourceAuthor: 'Fred' }
      , userData = { username: "eeee", password: "eeeeeeee", email: "valid@email.com", twitterHandle: 'zetwit' }
      , userbisData = { username: "easdeee", password: "eeeeeeee", email: "validagain@email.com", twitterHandle: 'zetwitkk' }
      ;

    clock = sinon.useFakeTimers(fakeNow.getTime());
    function theRemove(collection, cb) { collection.remove({}, function(err) { cb(err); }); }   // Remove everything from collection

    async.waterfall([
      async.apply(theRemove, Credentials)
    , async.apply(theRemove, User)
    , async.apply(theRemove, Tldr)
    , async.apply(theRemove, TwitterAnalytics)
    , function (cb) { User.createAndSaveInstance(userData, function(err, _user) { user = _user; cb(err); }); }
    , function (cb) { User.createAndSaveInstance(userbisData, function(err, _user) { userbis = _user; cb(err); }); }
    , function (cb) { Tldr.createAndSaveInstance(tldrData1, user, function(err, _tldr) { tldr1 = _tldr; cb(err); }); }
    , function (cb) { Tldr.createAndSaveInstance(tldrData2, user, function(err, _tldr) { tldr2 = _tldr; cb(err); }); }
    , function (cb) { Tldr.createAndSaveInstance(tldrData3, userbis, function(err, _tldr) { tldr3 = _tldr; cb(err); }); }
    ], done);
  });

  afterEach(function (done) {
    clock.restore();
    done();
  });

  it('Can add possibleUrls to a tldr with the right Twitter Analytics', function (done) {
    var tldrMessage = { possibleUrls: [ 'http://yes.com/article' ], _id: tldr2._id }
      , taOptions = { urls: ['http://blop.com/article']
                  , expandedUrls: { 'http://blop.com/article': 'http://yes.com/article' }
                  , userId: user._id
                  , testing: true
                  }
      ;

    // Nothing registered in the Twitter Analytics yet
    tldrsWithRedirectedUrls.checkTARedirectionChain(tldrMessage, function () {
      Tldr.findOne({ _id: tldr2._id }, function (err, tldr) {
        tldr._id.toString().should.equal(tldr2._id.toString());

        tldr.possibleUrls.length.should.equal(1);
        tldr.possibleUrls.should.contain('http://yes.com/article');

        // Now we test again after adding a Twitter Analytics
        TwitterAnalytics.addRequest(taOptions, function () {
          tldrsWithRedirectedUrls.checkTARedirectionChain(tldrMessage, function () {
            Tldr.findOne({ _id: tldr2._id }, function (err, tldr) {
              tldr._id.toString().should.equal(tldr2._id.toString());
              tldr.possibleUrls.length.should.equal(2);
              tldr.possibleUrls.should.contain('http://yes.com/article');
              tldr.possibleUrls.should.contain('http://blop.com/article');

              done();
            });
          });
        });
      });
    });
  });

});   // ==== End of 'Tldrs with redirected urls' ==== //
