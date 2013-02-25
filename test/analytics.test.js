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
  , UserAnalytics = models.UserAnalytics
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
  var user, userbis, tldr1, tldr2, tldr3;

  before(function (done) {
    db.connectToDatabase(done);
  });

  after(function (done) {
    db.closeDatabaseConnection(done);
  });

  beforeEach(function (done) {
    var tldrData1 = {url: 'http://needforair.com/nutcrackers', articleWordCount: 400, title:'nutcrackers', summaryBullets: ['Awesome Blog'], resourceAuthor: 'Charles' }
      , tldrData2 = {url: 'http://avc.com/mba-monday', title:'mba-monday', articleWordCount: 500, summaryBullets: ['Fred Wilson is my God'], resourceAuthor: 'Fred' }
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
    , async.apply(theRemove, Event)
    , async.apply(theRemove, TldrAnalytics.daily)
    , async.apply(theRemove, TldrAnalytics.monthly)
    , async.apply(theRemove, UserAnalytics.daily)
    , async.apply(theRemove, UserAnalytics.monthly)
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

  // Make sure the start state is well known
  it('Creating two tldrs for testing should already have created their analytics even if they dont existed before', function (done) {
    TldrAnalytics.daily.findOne({ timestamp: dayNow, tldr: tldr1._id }, function (err, tldrEventD) {
      tldrEventD.readCount.should.equal(1);
      TldrAnalytics.daily.findOne({ timestamp: dayNow, tldr: tldr2._id }, function (err, tldrEventD) {
        tldrEventD.readCount.should.equal(1);
        TldrAnalytics.monthly.findOne({ timestamp: monthNow, tldr: tldr1._id }, function (err, tldrEventD) {
          tldrEventD.readCount.should.equal(1);
          TldrAnalytics.monthly.findOne({ timestamp: monthNow, tldr: tldr2._id }, function (err, tldrEventD) {
            tldrEventD.readCount.should.equal(1);
            done();
          });
        });
      });
    });
  });


  describe('Event model', function () {

    it('Can add read events that have the expected form and are all different', function (done) {
      Event.addRead(tldr1, function (err, event) {
        event.type.should.equal('tldr.read');
        event.timestamp.getTime().should.equal(fakeNow.getTime());
        event.tldr.toString().should.equal(tldr1._id.toString());
        event.readCount.should.equal(1);
        event.articleWordCount.should.equal(400);
        event.creator.toString().should.equal(user._id.toString());

        clock.tick(2300);   // 2.3s forward
        Event.addRead(tldr1, function (err, event) {
          event.type.should.equal('tldr.read');
          event.timestamp.getTime().should.equal(fakeNow.getTime() + 2300);
          event.tldr.toString().should.equal(tldr1._id.toString());
          event.articleWordCount.should.equal(400);

          Event.find({}, function (err, events) {
            events.length.should.equal(5);   // 2 events have been created when we created tldr1, tldr2 and tldr3
            done();
          });
        });
      });
    });

  });   // === End of 'Event model' ==== //

  // Usable with async.apply
  function asyncClockTick (time, cb) { clock.tick(time); return cb(); }

  describe('TldrAnalytics (both daily and monthly)', function () {
    // Usable with async.apply
    function addRead (Model, tldr, cb) { Model.addRead(tldr, function(err) { return cb(err); }); }

    describe('if multiple events are added the same period for the same tldr, they should be aggregated', function () {
      function doTest (Model, stayInPeriod, resolutionNow, cb) {
        Model.addRead(tldr1, function (err) {
          clock.tick(2 * stayInPeriod);
          Model.addRead(tldr1, function (err) {
            Model.find({ tldr: tldr1._id }, function (err, tldrEvents) {
              tldrEvents.length.should.equal(1);
              tldrEvents[0].tldr.toString().should.equal(tldr1._id.toString());
              tldrEvents[0].timestamp.getTime().should.equal(resolutionNow.getTime());
              tldrEvents[0].readCount.should.equal(3);
              tldrEvents[0].articleWordCount.should.equal(1200);
              clock.tick(stayInPeriod);
              Model.addRead(tldr1, function (err) {
                Model.find({ tldr: tldr1._id }, function (err, tldrEvents) {
                  tldrEvents.length.should.equal(1);
                  tldrEvents[0].tldr.toString().should.equal(tldr1._id.toString());
                  tldrEvents[0].timestamp.getTime().should.equal(resolutionNow.getTime());
                  tldrEvents[0].readCount.should.equal(4);
                  tldrEvents[0].articleWordCount.should.equal(1600);

                  cb();
                });
              });
            });
          });
        });
      }

      it('daily', function (done) {
        doTest(TldrAnalytics.daily, 2 * 3600 * 1000, dayNow, done);
      });

      it('monthly', function (done) {
        doTest(TldrAnalytics.monthly, 2 * 24 * 3600 * 1000, monthNow, done);
      });
    });

    describe('Events that are added in a different period are aggregated in a different document', function () {
      function doTest(Model, stayInPeriod, goToNextPeriod, resolutionNow, resolutionNext, cb) {
        Model.addRead(tldr1, function (err) {
          clock.tick(stayInPeriod);
          Model.addRead(tldr1, function (err) {
            Model.find({ tldr: tldr1._id }, function (err, tldrEvents) {
              tldrEvents.length.should.equal(1);
              tldrEvents[0].tldr.toString().should.equal(tldr1._id.toString());
              tldrEvents[0].timestamp.getTime().should.equal(resolutionNow.getTime());
              tldrEvents[0].readCount.should.equal(3);
              tldrEvents[0].articleWordCount.should.equal(1200);
              clock.tick(goToNextPeriod);
              Model.addRead(tldr1, function (err) {
                Model.find({ tldr: tldr1._id }, function (err, tldrEvents) {
                  tldrEvents.length.should.equal(2);

                  Model.findOne({ tldr: tldr1._id, timestamp: resolutionNow }, function (err, tldrEvent) {
                    tldrEvent.tldr.toString().should.equal(tldr1._id.toString());
                    tldrEvent.timestamp.getTime().should.equal(resolutionNow.getTime());
                    tldrEvent.readCount.should.equal(3);
                    tldrEvent.articleWordCount.should.equal(1200);

                    Model.findOne({ tldr: tldr1._id, timestamp: resolutionNext }, function (err, tldrEvent) {
                      tldrEvent.tldr.toString().should.equal(tldr1._id.toString());
                      tldrEvent.timestamp.getTime().should.equal(resolutionNext.getTime());
                      tldrEvent.readCount.should.equal(1);
                      tldrEvent.articleWordCount.should.equal(400);

                      cb();
                    });
                  });
                });
              });
            });
          });
        });
      }

      it('daily', function (done) {
        doTest(TldrAnalytics.daily, 4 * 3600 * 1000, 12 * 3600 * 1000, dayNow, tomorrow, done);
      });

      it('monthly', function (done) {
        doTest(TldrAnalytics.monthly, 4 * 24 * 3600 * 1000, 25 * 24 * 3600 * 1000, monthNow, nextMonth, done);
      });
    });

    describe('Events that are added the same day but for different tldrs are aggregated in a different document', function () {
      function doTest (Model, stayInPeriod, resolutionNow, cb) {
        Model.addRead(tldr1, function (err) {
          clock.tick(2 * stayInPeriod);
          Model.addRead(tldr1, function (err) {
            Model.find({ tldr: tldr1._id }, function (err, tldrEvents) {
              tldrEvents.length.should.equal(1);
              tldrEvents[0].tldr.toString().should.equal(tldr1._id.toString());
              tldrEvents[0].timestamp.getTime().should.equal(resolutionNow.getTime());
              tldrEvents[0].readCount.should.equal(3);
              tldrEvents[0].articleWordCount.should.equal(1200);
              clock.tick(stayInPeriod);
              Model.addRead(tldr2, function (err) {
                Model.find({}, function (err, tldrEvents) {
                  tldrEvents.length.should.equal(3);

                  Model.findOne({ tldr: tldr1._id, timestamp: resolutionNow }, function (err, tldrEvent) {
                    tldrEvent.tldr.toString().should.equal(tldr1._id.toString());
                    tldrEvent.timestamp.getTime().should.equal(resolutionNow.getTime());
                    tldrEvent.readCount.should.equal(3);
                    tldrEvent.articleWordCount.should.equal(1200);

                    Model.findOne({ tldr: tldr2._id, timestamp: resolutionNow }, function (err, tldrEvent) {
                      tldrEvent.tldr.toString().should.equal(tldr2._id.toString());
                      tldrEvent.timestamp.getTime().should.equal(resolutionNow.getTime());
                      tldrEvent.readCount.should.equal(2);
                      tldrEvent.articleWordCount.should.equal(1000);

                      cb();
                    });
                  });
                });
              });
            });
          });
        });
      }

      it('daily', function (done) {
        doTest(TldrAnalytics.daily, 2 * 3600 * 1000, dayNow, done);
      });

      it('monthly', function (done) {
        doTest(TldrAnalytics.monthly, 2 * 24 * 3600 * 1000, monthNow, done);
      });
    });

    describe('Should give you all the analytics if you dont give dates', function () {
      function doTest (Model, period, resolutions, cb) {
        async.waterfall([
          async.apply(addRead, Model, tldr1)
        , async.apply(asyncClockTick, period)
        , async.apply(addRead, Model, tldr1)
        , async.apply(addRead, Model, tldr1)
        , async.apply(asyncClockTick, period)
        , async.apply(addRead, Model, tldr1)
        , async.apply(asyncClockTick, period)
        , async.apply(addRead, Model, tldr1)
        , async.apply(addRead, Model, tldr2)
        , async.apply(addRead, Model, tldr2)
        , async.apply(addRead, Model, tldr2)
        , async.apply(addRead, Model, tldr1)
        , async.apply(addRead, Model, tldr1)
        , function (_cb) {
            Model.getData(null, null, tldr1._id, function (err, data) {
              data.length.should.equal(4);
              data[0].timestamp.getTime().should.equal(resolutions[0].getTime());
              data[0].readCount.should.equal(2);
              data[0].articleWordCount.should.equal(800);
              data[0].cumulative.readCount.should.equal(2);
              data[0].cumulative.articleWordCount.should.equal(800);

              data[1].timestamp.getTime().should.equal(resolutions[1].getTime());
              data[1].readCount.should.equal(2);
              data[1].articleWordCount.should.equal(800);
              data[1].cumulative.readCount.should.equal(4);
              data[1].cumulative.articleWordCount.should.equal(1600);

              data[2].timestamp.getTime().should.equal(resolutions[2].getTime());
              data[2].readCount.should.equal(1);
              data[2].articleWordCount.should.equal(400);
              data[2].cumulative.readCount.should.equal(5);
              data[2].cumulative.articleWordCount.should.equal(2000);

              data[3].timestamp.getTime().should.equal(resolutions[3].getTime());
              data[3].readCount.should.equal(3);
              data[3].articleWordCount.should.equal(1200);
              data[3].cumulative.readCount.should.equal(8);
              data[3].cumulative.articleWordCount.should.equal(3200);
              _cb();
            });
          }
        ], cb);
      }

      it('daily', function (done) {
        doTest(TldrAnalytics.daily, 24 * 3600 * 1000, [dayNow, tomorrow, new Date(2005, 6, 17), new Date(2005, 6, 18)], done);
      });

      it('monhly', function (done) {
        doTest(TldrAnalytics.monthly, 24 * 30 * 3600 * 1000, [monthNow, nextMonth, new Date(2005, 8, 1), new Date(2005, 9, 1)], done);
      });
    });

    describe('Should give you only the analytics corresponding to the dates you want', function () {
      function doTest(Model, period, resolutions, cb) {
        async.waterfall([
          async.apply(addRead, Model, tldr1)
        , async.apply(asyncClockTick, period)
        , async.apply(addRead, Model, tldr1)
        , async.apply(addRead, Model, tldr1)
        , async.apply(asyncClockTick, period)
        , async.apply(addRead, Model, tldr1)
        , async.apply(asyncClockTick, period)
        , async.apply(addRead, Model, tldr1)
        , async.apply(addRead, Model, tldr2)
        , async.apply(addRead, Model, tldr2)
        , async.apply(addRead, Model, tldr2)
        , async.apply(addRead, Model, tldr1)
        , async.apply(addRead, Model, tldr1)
        , function (_cb) {
            Model.getData(null, new Date(resolutions[1].getTime() + period / 2), tldr1._id, function (err, data) {
              data.length.should.equal(2);
              data[0].timestamp.getTime().should.equal(resolutions[0].getTime());
              data[0].readCount.should.equal(2);
              data[0].articleWordCount.should.equal(800);
              data[1].timestamp.getTime().should.equal(resolutions[1].getTime());
              data[1].readCount.should.equal(2);
              data[1].articleWordCount.should.equal(800);
              _cb();
            });
          }
        , function (_cb) {
            Model.getData(new Date(resolutions[2].getTime() + period / 2), null, tldr1._id, function (err, data) {
              data.length.should.equal(1);
              data[0].timestamp.getTime().should.equal(resolutions[3].getTime());
              data[0].readCount.should.equal(3);
              data[0].articleWordCount.should.equal(1200);
              _cb();
            });
          }
        , function (_cb) {
            Model.getData(new Date(resolutions[1].getTime() + period / 2), new Date(resolutions[2].getTime() + period / 2), tldr1._id, function (err, data) {
              data.length.should.equal(1);
              data[0].timestamp.getTime().should.equal(resolutions[2].getTime());
              data[0].readCount.should.equal(1);
              data[0].articleWordCount.should.equal(400);
              _cb();
            });
          }
        ], cb);
      }

      it('daily', function (done) {
        doTest(TldrAnalytics.daily, 24 * 3600 * 1000, [dayNow, tomorrow, new Date(2005, 6, 17), new Date(2005, 6, 18)], done);
      });

      it('monthly', function (done) {
        doTest(TldrAnalytics.monthly, 24 * 30 * 3600 * 1000, [monthNow, nextMonth, new Date(2005, 8, 1), new Date(2005, 9, 1)], done);
      });
    });

  });   // ==== End of 'TldrAnalytics' ==== //


  describe('UserAnalytics', function () {
    // Usable with async.apply
    function addRead (Model, tldr, cb) { Model.addRead(tldr, function(err) { return cb(err); }); }

    describe('Events should be aggregated by user', function () {
      function doTest (Model, stayInPeriod, resolutionNow, cb) {
        Model.addRead(tldr1, function (err) {
          clock.tick(2 * stayInPeriod);
          Model.addRead(tldr1, function (err) {
            Model.find({ user: user._id }, function (err, userEvents) {
              userEvents.length.should.equal(1);
              userEvents[0].user.toString().should.equal(user._id.toString());
              userEvents[0].timestamp.getTime().should.equal(resolutionNow.getTime());
              userEvents[0].readCount.should.equal(4);
              userEvents[0].articleWordCount.should.equal(1700);
              clock.tick(stayInPeriod);
              Model.addRead(tldr3, function (err) {   // Not written by user, so nothing to add for him
                Model.find({ user: user._id }, function (err, userEvents) {
                  userEvents.length.should.equal(1);
                  userEvents[0].user.toString().should.equal(user._id.toString());
                  userEvents[0].timestamp.getTime().should.equal(resolutionNow.getTime());
                  userEvents[0].readCount.should.equal(4);
                  userEvents[0].articleWordCount.should.equal(1700);

                  Model.find({ user: userbis._id }, function (err, userEvents) {
                  userEvents.length.should.equal(1);
                  userEvents[0].user.toString().should.equal(userbis._id.toString());
                  userEvents[0].timestamp.getTime().should.equal(resolutionNow.getTime());
                  userEvents[0].readCount.should.equal(2);
                  userEvents[0].articleWordCount.should.equal(1400);

                    cb();
                  });
                });
              });
            });
          });
        });
      }

      it('daily', function (done) {
        doTest(UserAnalytics.daily, 2 * 3600 * 1000, dayNow, done);
      });

      it('monthly', function (done) {
        doTest(UserAnalytics.monthly, 2 * 24 * 3600 * 1000, monthNow, done);
      });
    });

    describe('Events should also be aggregated by date', function () {
      function doTest(Model, stayInPeriod, goToNextPeriod, resolutionNow, resolutionNext, cb) {
        Model.addRead(tldr1, function (err) {
          clock.tick(stayInPeriod);
          Model.addRead(tldr2, function (err) {
            Model.find({ user: user._id }, function (err, userEvents) {
              userEvents.length.should.equal(1);
              userEvents[0].user.toString().should.equal(user._id.toString());
              userEvents[0].timestamp.getTime().should.equal(resolutionNow.getTime());
              userEvents[0].readCount.should.equal(4);
              userEvents[0].articleWordCount.should.equal(1800);
              clock.tick(goToNextPeriod);
              Model.addRead(tldr2, function (err) {
                Model.find({ user: user._id }, function (err, userEvents) {
                  userEvents.length.should.equal(2);

                  Model.findOne({ user: user._id, timestamp: resolutionNow }, function (err, userEvent) {
                    userEvent.user.toString().should.equal(user._id.toString());
                    userEvent.timestamp.getTime().should.equal(resolutionNow.getTime());
                    userEvent.readCount.should.equal(4);
                    userEvent.articleWordCount.should.equal(1800);

                    Model.findOne({ user: user._id, timestamp: resolutionNext }, function (err, userEvent) {
                      userEvent.user.toString().should.equal(user._id.toString());
                      userEvent.timestamp.getTime().should.equal(resolutionNext.getTime());
                      userEvent.readCount.should.equal(1);
                      userEvent.articleWordCount.should.equal(500);

                      cb();
                    });
                  });
                });
              });
            });
          });
        });
      }

      it('daily', function (done) {
        doTest(UserAnalytics.daily, 4 * 3600 * 1000, 12 * 3600 * 1000, dayNow, tomorrow, done);
      });

      it('monthly', function (done) {
        doTest(UserAnalytics.monthly, 4 * 24 * 3600 * 1000, 25 * 24 * 3600 * 1000, monthNow, nextMonth, done);
      });
    });

    describe('Should give you all the analytics if you dont give dates', function () {
      function doTest (Model, period, resolutions, cb) {
        async.waterfall([
          async.apply(addRead, Model, tldr1)
        , async.apply(asyncClockTick, period)
        , async.apply(addRead, Model, tldr1)
        , async.apply(addRead, Model, tldr2)
        , async.apply(addRead, Model, tldr3)
        , async.apply(asyncClockTick, period)
        , async.apply(addRead, Model, tldr3)
        , async.apply(asyncClockTick, period)
        , async.apply(addRead, Model, tldr1)
        , async.apply(addRead, Model, tldr2)
        , async.apply(addRead, Model, tldr2)
        , async.apply(addRead, Model, tldr3)
        , async.apply(addRead, Model, tldr3)
        , async.apply(addRead, Model, tldr1)
        , function (_cb) {
            Model.getData(null, null, user._id, function (err, data) {
              data.length.should.equal(3);
              data[0].timestamp.getTime().should.equal(resolutions[0].getTime());
              data[0].readCount.should.equal(3);
              data[0].articleWordCount.should.equal(1300);
              data[1].timestamp.getTime().should.equal(resolutions[1].getTime());
              data[1].readCount.should.equal(2);
              data[1].articleWordCount.should.equal(900);
              data[2].timestamp.getTime().should.equal(resolutions[3].getTime());
              data[2].readCount.should.equal(4);
              data[2].articleWordCount.should.equal(1800);
              _cb();
            });
          }
        , function (_cb) {
            Model.getData(null, null, userbis._id, function (err, data) {
              data.length.should.equal(4);
              data[0].timestamp.getTime().should.equal(resolutions[0].getTime());
              data[0].readCount.should.equal(1);
              data[0].articleWordCount.should.equal(700);
              data[1].timestamp.getTime().should.equal(resolutions[1].getTime());
              data[1].readCount.should.equal(1);
              data[1].articleWordCount.should.equal(700);
              data[2].timestamp.getTime().should.equal(resolutions[2].getTime());
              data[2].readCount.should.equal(1);
              data[2].articleWordCount.should.equal(700);
              data[3].timestamp.getTime().should.equal(resolutions[3].getTime());
              data[3].readCount.should.equal(2);
              data[3].articleWordCount.should.equal(1400);
              _cb();
            });
          }
        ], cb);
      }

      it('daily', function (done) {
        doTest(UserAnalytics.daily, 24 * 3600 * 1000, [dayNow, tomorrow, new Date(2005, 6, 17), new Date(2005, 6, 18)], done);
      });

      it('monhly', function (done) {
        doTest(UserAnalytics.monthly, 24 * 30 * 3600 * 1000, [monthNow, nextMonth, new Date(2005, 8, 1), new Date(2005, 9, 1)], done);
      });
    });

    describe('Should be able to specify beg and end to clip stats results', function () {

      it('The tests on TldrAnalytics are sufficient as the same function is used underneath', function (done) {
        done();
      });

    });

  });   // ==== End of 'UserAnalytics' ==== //

});
