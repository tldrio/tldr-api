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
  , TldrAnalytics = models.TldrAnalytics
  , config = require('../lib/config')
  , DbObject = require('../lib/db')
  , db = new DbObject(config.dbHost, config.dbName, config.dbPort)
  , async = require('async')
  , clock
  , fakeNow = new Date(2005, 6, 15, 14, 30, 30, 500)
  , dayNow = new Date(2005, 6, 15)
  , tomorrow = new Date(2005, 6, 16)
  , monthNow = new Date(2005, 6, 1)
  , nextMonth = new Date(2005, 7, 1)
  ;


// Version of setTimeout usable with async.apply
// Used to integration test parts using the message queue
function wait (millis, cb) {
  setTimeout(cb, millis);
}


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
    , async.apply(theRemove, TldrAnalytics.daily)
    , async.apply(theRemove, TldrAnalytics.monthly)
    , function (cb) { User.createAndSaveInstance(userData, function(err, _user) { user = _user; cb(err); }); }
    , function (cb) { Tldr.createAndSaveInstance(tldrData1, user, function(err, _tldr) { tldr1 = _tldr; cb(err); }); }
    , function (cb) { Tldr.createAndSaveInstance(tldrData2, user, function(err, _tldr) { tldr2 = _tldr; cb(err); }); }
    ], done);
  });

  afterEach(function (done) {
    clock.restore();
    done();
  });


  describe('Event model', function () {

    it('Can add read events that have the expected form and are all different', function (done) {
      Event.addRead(tldr1, function (err, event) {
        event.type.should.equal('tldr.read');
        event.timestamp.getTime().should.equal(fakeNow.getTime());
        event.tldr.toString().should.equal(tldr1._id.toString());
        event.readCount.should.equal(1);
        event.creator.toString().should.equal(user._id.toString());

        clock.tick(2300);   // 2.3s forward
        Event.addRead(tldr1, function (err, event) {
          event.type.should.equal('tldr.read');
          event.timestamp.getTime().should.equal(fakeNow.getTime() + 2300);
          event.tldr.toString().should.equal(tldr1._id.toString());

          Event.find({}, function (err, events) {
            events.length.should.equal(2);
            done();
          });
        });
      });
    });

  });   // === End of 'Event model' ==== //


  describe('TldrAnalytics.daily', function () {
    // Usable with async.apply
    function addDailyRead (tldr, cb) { TldrAnalytics.daily.addRead(tldr, function(err) { return cb(err); }); }
    function asyncClockTick (time, cb) { clock.tick(time); return cb(); }

    it('should add events to the daily collection if they dont exist', function (done) {
      TldrAnalytics.daily.addRead(tldr1, function (err) {
        assert.isNull(err);
        TldrAnalytics.daily.findOne({ timestamp: dayNow, tldr: tldr1._id }, function (err, tldrEventD) {
          tldrEventD.readCount.should.equal(1);
          // TODO: test with the tldr's wordsCount
          done();
        });
      });
    });

    it('it also works when selecting by tldr id instead of tldr', function (done) {
      TldrAnalytics.daily.addRead(tldr1._id, function (err) {
        assert.isNull(err);
        TldrAnalytics.daily.findOne({ timestamp: dayNow, tldr: tldr1 }, function (err, tldrEventD) {
          tldrEventD.readCount.should.equal(1);
          done();
        });
      });
    });

    it('if multiple events are added the same day for the same tldr, they should be aggregated', function (done) {
      TldrAnalytics.daily.addRead(tldr1, function (err) {
        clock.tick(4 * 3600 * 1000);   // Fast forward 4 hours
        TldrAnalytics.daily.addRead(tldr1, function (err) {
          TldrAnalytics.daily.find({}, function (err, tldrEventDs) {
            tldrEventDs.length.should.equal(1);
            tldrEventDs[0].tldr.toString().should.equal(tldr1._id.toString());
            tldrEventDs[0].timestamp.getTime().should.equal(dayNow.getTime());
            tldrEventDs[0].readCount.should.equal(2);
            clock.tick(2 * 3600 * 1000);   // Fast forward 2 hours
            TldrAnalytics.daily.addRead(tldr1, function (err) {
              TldrAnalytics.daily.find({}, function (err, tldrEventDs) {
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
      TldrAnalytics.daily.addRead(tldr1, function (err) {
        clock.tick(4 * 3600 * 1000);   // Fast forward 4 hours
        TldrAnalytics.daily.addRead(tldr1, function (err) {
          TldrAnalytics.daily.find({}, function (err, tldrEventDs) {
            tldrEventDs.length.should.equal(1);
            tldrEventDs[0].tldr.toString().should.equal(tldr1._id.toString());
            tldrEventDs[0].timestamp.getTime().should.equal(dayNow.getTime());
            tldrEventDs[0].readCount.should.equal(2);
            clock.tick(12 * 3600 * 1000);   // Fast forward 12 hours
            TldrAnalytics.daily.addRead(tldr1, function (err) {
              TldrAnalytics.daily.find({}, function (err, tldrEventDs) {
                tldrEventDs.length.should.equal(2);

                TldrAnalytics.daily.findOne({ tldr: tldr1._id, timestamp: dayNow }, function (err, tldrEventD) {
                  tldrEventD.tldr.toString().should.equal(tldr1._id.toString());
                  tldrEventD.timestamp.getTime().should.equal(dayNow.getTime());
                  tldrEventD.readCount.should.equal(2);

                  TldrAnalytics.daily.findOne({ tldr: tldr1._id, timestamp: tomorrow }, function (err, tldrEventD) {
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
      TldrAnalytics.daily.addRead(tldr1, function (err) {
        clock.tick(4 * 3600 * 1000);   // Fast forward 4 hours
        TldrAnalytics.daily.addRead(tldr1, function (err) {
          TldrAnalytics.daily.find({}, function (err, tldrEventDs) {
            tldrEventDs.length.should.equal(1);
            tldrEventDs[0].tldr.toString().should.equal(tldr1._id.toString());
            tldrEventDs[0].timestamp.getTime().should.equal(dayNow.getTime());
            tldrEventDs[0].readCount.should.equal(2);
            clock.tick(2 * 3600 * 1000);   // Fast forward 2 hours
            TldrAnalytics.daily.addRead(tldr2, function (err) {
              TldrAnalytics.daily.find({}, function (err, tldrEventDs) {
                tldrEventDs.length.should.equal(2);

                TldrAnalytics.daily.findOne({ tldr: tldr1._id, timestamp: dayNow }, function (err, tldrEventD) {
                  tldrEventD.tldr.toString().should.equal(tldr1._id.toString());
                  tldrEventD.timestamp.getTime().should.equal(dayNow.getTime());
                  tldrEventD.readCount.should.equal(2);

                  TldrAnalytics.daily.findOne({ tldr: tldr2._id, timestamp: dayNow }, function (err, tldrEventD) {
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

    it('Should give you all the analytics if you dont give dates', function (done) {
      async.waterfall([
        async.apply(addDailyRead, tldr1)
      , async.apply(asyncClockTick, 24 * 3600 * 1000)
      , async.apply(addDailyRead, tldr1)
      , async.apply(addDailyRead, tldr1)
      , async.apply(asyncClockTick, 24 * 3600 * 1000)
      , async.apply(addDailyRead, tldr1)
      , async.apply(asyncClockTick, 24 * 3600 * 1000)
      , async.apply(addDailyRead, tldr1)
      , async.apply(addDailyRead, tldr2)
      , async.apply(addDailyRead, tldr2)
      , async.apply(addDailyRead, tldr2)
      , async.apply(addDailyRead, tldr1)
      , async.apply(addDailyRead, tldr1)
      , function (cb) {
          TldrAnalytics.daily.getData(null, null, tldr1, function (err, data) {
            data.length.should.equal(4);
            data[0].timestamp.getTime().should.equal(dayNow.getTime() + 0 * 24 * 3600 * 1000);
            data[0].readCount.should.equal(1);
            data[1].timestamp.getTime().should.equal(dayNow.getTime() + 1 * 24 * 3600 * 1000);
            data[1].readCount.should.equal(2);
            data[2].timestamp.getTime().should.equal(dayNow.getTime() + 2 * 24 * 3600 * 1000);
            data[2].readCount.should.equal(1);
            data[3].timestamp.getTime().should.equal(dayNow.getTime() + 3 * 24 * 3600 * 1000);
            data[3].readCount.should.equal(3);
            cb();
          });
        }
      ], done);
    });

  });   // ==== End of 'TldrAnalytics.daily' ==== //


  describe('TldrAnalytics.monthly - Copy of .daily whose purpose is mainly to test that code is correctly modularized', function () {

    it('should add events to the monthly collection if they dont exist', function (done) {
      TldrAnalytics.monthly.addRead(tldr1, function (err) {
        assert.isNull(err);
        TldrAnalytics.monthly.findOne({ timestamp: monthNow, tldr: tldr1._id }, function (err, tldrEventD) {
          tldrEventD.readCount.should.equal(1);
          // TODO: test with the tldr's wordsCount
          done();
        });
      });
    });

    it('if multiple events are added the same month for the same tldr, they should be aggregated', function (done) {
      TldrAnalytics.monthly.addRead(tldr1, function (err) {
        clock.tick(4 * 24 * 3600 * 1000);   // Fast forward 4 days
        TldrAnalytics.monthly.addRead(tldr1, function (err) {
          TldrAnalytics.monthly.find({}, function (err, tldrEventDs) {
            tldrEventDs.length.should.equal(1);
            tldrEventDs[0].tldr.toString().should.equal(tldr1._id.toString());
            tldrEventDs[0].timestamp.getTime().should.equal(monthNow.getTime());
            tldrEventDs[0].readCount.should.equal(2);
            clock.tick(2 * 24 * 3600 * 1000);   // Fast forward 2 more days
            TldrAnalytics.monthly.addRead(tldr1, function (err) {
              TldrAnalytics.monthly.find({}, function (err, tldrEventDs) {
                tldrEventDs.length.should.equal(1);
                tldrEventDs[0].tldr.toString().should.equal(tldr1._id.toString());
                tldrEventDs[0].timestamp.getTime().should.equal(monthNow.getTime());
                tldrEventDs[0].readCount.should.equal(3);

                done();
              });
            });
          });
        });
      });
    });

    it('Events that are added in a different month are aggregated in a different document', function (done) {
      TldrAnalytics.monthly.addRead(tldr1, function (err) {
        clock.tick(4 * 24 * 3600 * 1000);   // Fast forward 4 days
        TldrAnalytics.monthly.addRead(tldr1, function (err) {
          TldrAnalytics.monthly.find({}, function (err, tldrEventDs) {
            tldrEventDs.length.should.equal(1);
            tldrEventDs[0].tldr.toString().should.equal(tldr1._id.toString());
            tldrEventDs[0].timestamp.getTime().should.equal(monthNow.getTime());
            tldrEventDs[0].readCount.should.equal(2);
            clock.tick(20 * 24 * 3600 * 1000);   // Fast forward 20 days
            TldrAnalytics.monthly.addRead(tldr1, function (err) {
              TldrAnalytics.monthly.find({}, function (err, tldrEventDs) {
                tldrEventDs.length.should.equal(2);

                TldrAnalytics.monthly.findOne({ tldr: tldr1._id, timestamp: monthNow }, function (err, tldrEventD) {
                  tldrEventD.tldr.toString().should.equal(tldr1._id.toString());
                  tldrEventD.timestamp.getTime().should.equal(monthNow.getTime());
                  tldrEventD.readCount.should.equal(2);

                  TldrAnalytics.monthly.findOne({ tldr: tldr1._id, timestamp: nextMonth }, function (err, tldrEventD) {
                    tldrEventD.tldr.toString().should.equal(tldr1._id.toString());
                    tldrEventD.timestamp.getTime().should.equal(nextMonth.getTime());
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

    it('Events that are added the same month but for different tldrs are aggregated in a different document', function (done) {
      TldrAnalytics.monthly.addRead(tldr1, function (err) {
        clock.tick(4 * 24 * 3600 * 1000);   // Fast forward 4 days
        TldrAnalytics.monthly.addRead(tldr1, function (err) {
          TldrAnalytics.monthly.find({}, function (err, tldrEventDs) {
            tldrEventDs.length.should.equal(1);
            tldrEventDs[0].tldr.toString().should.equal(tldr1._id.toString());
            tldrEventDs[0].timestamp.getTime().should.equal(monthNow.getTime());
            tldrEventDs[0].readCount.should.equal(2);
            clock.tick(2 * 24 * 3600 * 1000);   // Fast forward 2 days
            TldrAnalytics.monthly.addRead(tldr2, function (err) {
              TldrAnalytics.monthly.find({}, function (err, tldrEventDs) {
                tldrEventDs.length.should.equal(2);

                TldrAnalytics.monthly.findOne({ tldr: tldr1._id, timestamp: monthNow }, function (err, tldrEventD) {
                  tldrEventD.tldr.toString().should.equal(tldr1._id.toString());
                  tldrEventD.timestamp.getTime().should.equal(monthNow.getTime());
                  tldrEventD.readCount.should.equal(2);

                  TldrAnalytics.monthly.findOne({ tldr: tldr2._id, timestamp: monthNow }, function (err, tldrEventD) {
                    tldrEventD.tldr.toString().should.equal(tldr2._id.toString());
                    tldrEventD.timestamp.getTime().should.equal(monthNow.getTime());
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

  });   // ==== End of 'TldrAnalytics.monthly' ==== //

});
