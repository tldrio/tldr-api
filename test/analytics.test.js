/**
 * Testing that analytics aggregation behaves as expected
 */


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
  , TldrEvent = models.TldrEvent
  , config = require('../lib/config')
  , DbObject = require('../lib/db')
  , db = new DbObject(config.dbHost, config.dbName, config.dbPort)
  , async = require('async')
  , clock, fakeNow = new Date(2005, 6, 15, 14, 30, 30, 500)
  ;


// Version of setTimeout usable with async.apply
// Used to integration test parts using the message queue
function wait (millis, cb) {
  setTimeout(cb, millis);
}


/**
 * Tests
 */
describe.only('Analytics', function () {
  var user, tldr1, tldr2;

  before(function (done) {
    clock = sinon.useFakeTimers(fakeNow.getTime());
    db.connectToDatabase(done);
  });

  after(function (done) {
    clock.restore();
    db.closeDatabaseConnection(done);
  });

  beforeEach(function (done) {
    var tldrData1 = {url: 'http://needforair.com/nutcrackers', title:'nutcrackers', summaryBullets: ['Awesome Blog'], resourceAuthor: 'Charles', resourceDate: new Date(), createdAt: new Date(), updatedAt: new Date()}
      , tldrData2 = {url: 'http://avc.com/mba-monday', title:'mba-monday', summaryBullets: ['Fred Wilson is my God'], resourceAuthor: 'Fred', resourceDate: new Date(), createdAt: new Date(), updatedAt: new Date()}
      , userData = { username: "eeee", password: "eeeeeeee", email: "valid@email.com", twitterHandle: 'zetwit' }
      ;

    function theRemove(collection, cb) { collection.remove({}, function(err) { cb(err); }); }   // Remove everything from collection

    async.waterfall([
      async.apply(theRemove, Credentials)
    , async.apply(theRemove, User)
    , async.apply(theRemove, Tldr)
    , async.apply(theRemove, Event)
    , async.apply(theRemove, TldrEvent.daily)
    , async.apply(theRemove, TldrEvent.monthly)
    , function (cb) { User.createAndSaveInstance(userData, function(err, _user) { user = _user; cb(err); }); }
    , function (cb) { Tldr.createAndSaveInstance(tldrData1, user, function(err, _tldr) { tldr1 = _tldr; cb(err); }); }
    , function (cb) { Tldr.createAndSaveInstance(tldrData2, user, function(err, _tldr) { tldr2 = _tldr; cb(err); }); }
    ], done);
  });

  describe('TldrEvent', function () {

    it('should add events to the daily collection if they dont exist', function (done) {
      TldrEvent.daily.addEvent(tldr1, function (err) {
        assert.isNull(err);
        done();
      });
    });

  });   // ==== End of 'TldrEvent' ==== //

});
