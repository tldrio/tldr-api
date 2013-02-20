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
  , clock
  , fakeNow = new Date(2005, 6, 15, 14, 30, 30, 500)
  , dayNow = new Date(2005, 6, 15)
  , tomorrow = new Date(2005, 6, 16)
  , monthNow = new Date(2005, 6, 1)
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
    db.connectToDatabase(done);
  });

  after(function (done) {
    db.closeDatabaseConnection(done);
  });

  beforeEach(function (done) {
    var tldrData1 = {url: 'http://needforair.com/nutcrackers', title:'nutcrackers', summaryBullets: ['Awesome Blog'], resourceAuthor: 'Charles', resourceDate: new Date(), createdAt: new Date(), updatedAt: new Date()}
      , tldrData2 = {url: 'http://avc.com/mba-monday', title:'mba-monday', summaryBullets: ['Fred Wilson is my God'], resourceAuthor: 'Fred', resourceDate: new Date(), createdAt: new Date(), updatedAt: new Date()}
      , userData = { username: "eeee", password: "eeeeeeee", email: "valid@email.com", twitterHandle: 'zetwit' }
      ;

    clock = sinon.useFakeTimers(fakeNow.getTime());
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

  afterEach(function (done) {
    clock.restore();
    done();
  });

  describe('TldrEvent.daily', function () {

    it('should add events to the daily collection if they dont exist', function (done) {
      TldrEvent.daily.addEvent(tldr1, function (err) {
        assert.isNull(err);
        TldrEvent.daily.findOne({ timestamp: dayNow, tldr: tldr1._id }, function (err, tldrEventD) {
          tldrEventD.readCount.should.equal(1);
          // TODO: test with the tldr's wordsReadCount
          done();
        });
      });
    });

    it('if multiple events are added the same day for the same tldr, they should be aggregated', function (done) {
      TldrEvent.daily.addEvent(tldr1, function (err) {
        clock.tick(4 * 3600 * 1000);   // Fast forward 4 hours
        TldrEvent.daily.addEvent(tldr1, function (err) {
          TldrEvent.daily.find({}, function (err, tldrEventDs) {
            tldrEventDs.length.should.equal(1);
            tldrEventDs[0].tldr.toString().should.equal(tldr1._id.toString());
            tldrEventDs[0].timestamp.getTime().should.equal(dayNow.getTime());
            tldrEventDs[0].readCount.should.equal(2);
            clock.tick(2 * 3600 * 1000);   // Fast forward 2 hours
            TldrEvent.daily.addEvent(tldr1, function (err) {
              TldrEvent.daily.find({}, function (err, tldrEventDs) {
                tldrEventDs.length.should.equal(1);
                tldrEventDs[0].tldr.toString().should.equal(tldr1._id.toString());
                tldrEventDs[0].timestamp.getTime().should.equal(dayNow.getTime());
                tldrEventDs[0].readCount.should.equal(3);

                done();
              });
            });
          });
        });
      });
    });

    it('Events that are added in a different day are aggregated in a different document', function (done) {
      TldrEvent.daily.addEvent(tldr1, function (err) {
        clock.tick(4 * 3600 * 1000);   // Fast forward 4 hours
        TldrEvent.daily.addEvent(tldr1, function (err) {
          TldrEvent.daily.find({}, function (err, tldrEventDs) {
            tldrEventDs.length.should.equal(1);
            tldrEventDs[0].tldr.toString().should.equal(tldr1._id.toString());
            tldrEventDs[0].timestamp.getTime().should.equal(dayNow.getTime());
            tldrEventDs[0].readCount.should.equal(2);
            clock.tick(12 * 3600 * 1000);   // Fast forward 2 hours
            TldrEvent.daily.addEvent(tldr1, function (err) {
              TldrEvent.daily.find({}, function (err, tldrEventDs) {
                tldrEventDs.length.should.equal(2);

                TldrEvent.daily.findOne({ tldr: tldr1._id, timestamp: dayNow }, function (err, tldrEventD) {
                  tldrEventD.tldr.toString().should.equal(tldr1._id.toString());
                  tldrEventD.timestamp.getTime().should.equal(dayNow.getTime());
                  tldrEventD.readCount.should.equal(2);

                  TldrEvent.daily.findOne({ tldr: tldr1._id, timestamp: tomorrow }, function (err, tldrEventD) {
                    tldrEventD.tldr.toString().should.equal(tldr1._id.toString());
                    tldrEventD.timestamp.getTime().should.equal(tomorrow.getTime());
                    tldrEventD.readCount.should.equal(1);

                    done();
                  });
                });
              });
            });
          });
        });
      });
    });

    it('Events that are added the same day but for different tldrs are aggregated in a different document', function (done) {
      TldrEvent.daily.addEvent(tldr1, function (err) {
        clock.tick(4 * 3600 * 1000);   // Fast forward 4 hours
        TldrEvent.daily.addEvent(tldr1, function (err) {
          TldrEvent.daily.find({}, function (err, tldrEventDs) {
            tldrEventDs.length.should.equal(1);
            tldrEventDs[0].tldr.toString().should.equal(tldr1._id.toString());
            tldrEventDs[0].timestamp.getTime().should.equal(dayNow.getTime());
            tldrEventDs[0].readCount.should.equal(2);
            clock.tick(2 * 3600 * 1000);   // Fast forward 2 hours
            TldrEvent.daily.addEvent(tldr2, function (err) {
              TldrEvent.daily.find({}, function (err, tldrEventDs) {
                tldrEventDs.length.should.equal(2);

                TldrEvent.daily.findOne({ tldr: tldr1._id, timestamp: dayNow }, function (err, tldrEventD) {
                  tldrEventD.tldr.toString().should.equal(tldr1._id.toString());
                  tldrEventD.timestamp.getTime().should.equal(dayNow.getTime());
                  tldrEventD.readCount.should.equal(2);

                  TldrEvent.daily.findOne({ tldr: tldr2._id, timestamp: dayNow }, function (err, tldrEventD) {
                    tldrEventD.tldr.toString().should.equal(tldr2._id.toString());
                    tldrEventD.timestamp.getTime().should.equal(dayNow.getTime());
                    tldrEventD.readCount.should.equal(1);

                    done();
                  });
                });
              });
            });
          });
        });
      });
    });

  });   // ==== End of 'TldrEvent' ==== //

});
