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
  , EmbedAnalytics = models.EmbedAnalytics
  , config = require('../lib/config')
  , mqClient = require('../lib/message-queue')
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



describe('Analytics', function () {
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
      assert.isNull(err);
      assert.isNull(tldrEventD);

      TldrAnalytics.daily.findOne({ timestamp: dayNow, tldr: tldr2._id }, function (err, tldrEventD) {
        assert.isNull(err);
        assert.isNull(tldrEventD);

        TldrAnalytics.monthly.findOne({ timestamp: monthNow, tldr: tldr1._id }, function (err, tldrEventD) {
          assert.isNull(err);
          assert.isNull(tldrEventD);

          TldrAnalytics.monthly.findOne({ timestamp: monthNow, tldr: tldr2._id }, function (err, tldrEventD) {
            assert.isNull(err);
            assert.isNull(tldrEventD);

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
            events.length.should.equal(2);   // 2 events have been created when we created tldr1, tldr2 and tldr3
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
              tldrEvents[0].readCount.should.equal(2);
              tldrEvents[0].articleWordCount.should.equal(800);
              clock.tick(stayInPeriod);
              Model.addRead(tldr1, function (err) {
                Model.find({ tldr: tldr1._id }, function (err, tldrEvents) {
                  tldrEvents.length.should.equal(1);
                  tldrEvents[0].tldr.toString().should.equal(tldr1._id.toString());
                  tldrEvents[0].timestamp.getTime().should.equal(resolutionNow.getTime());
                  tldrEvents[0].readCount.should.equal(3);
                  tldrEvents[0].articleWordCount.should.equal(1200);

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
              tldrEvents[0].readCount.should.equal(2);
              tldrEvents[0].articleWordCount.should.equal(800);
              clock.tick(goToNextPeriod);
              Model.addRead(tldr1, function (err) {
                Model.find({ tldr: tldr1._id }, function (err, tldrEvents) {
                  tldrEvents.length.should.equal(2);

                  Model.findOne({ tldr: tldr1._id, timestamp: resolutionNow }, function (err, tldrEvent) {
                    tldrEvent.tldr.toString().should.equal(tldr1._id.toString());
                    tldrEvent.timestamp.getTime().should.equal(resolutionNow.getTime());
                    tldrEvent.readCount.should.equal(2);
                    tldrEvent.articleWordCount.should.equal(800);

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
              tldrEvents[0].readCount.should.equal(2);
              tldrEvents[0].articleWordCount.should.equal(800);
              clock.tick(stayInPeriod);
              Model.addRead(tldr2, function (err) {
                Model.find({}, function (err, tldrEvents) {
                  tldrEvents.length.should.equal(2);

                  Model.findOne({ tldr: tldr1._id, timestamp: resolutionNow }, function (err, tldrEvent) {
                    tldrEvent.tldr.toString().should.equal(tldr1._id.toString());
                    tldrEvent.timestamp.getTime().should.equal(resolutionNow.getTime());
                    tldrEvent.readCount.should.equal(2);
                    tldrEvent.articleWordCount.should.equal(800);

                    Model.findOne({ tldr: tldr2._id, timestamp: resolutionNow }, function (err, tldrEvent) {
                      tldrEvent.tldr.toString().should.equal(tldr2._id.toString());
                      tldrEvent.timestamp.getTime().should.equal(resolutionNow.getTime());
                      tldrEvent.readCount.should.equal(1);
                      tldrEvent.articleWordCount.should.equal(500);

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
            Model.getAnalytics(null, null, tldr1._id, function (err, data) {
              data.length.should.equal(4);
              data[0].timestamp.getTime().should.equal(resolutions[0].getTime());
              data[0].readCount.should.equal(1);
              data[0].articleWordCount.should.equal(400);

              data[1].timestamp.getTime().should.equal(resolutions[1].getTime());
              data[1].readCount.should.equal(2);
              data[1].articleWordCount.should.equal(800);

              data[2].timestamp.getTime().should.equal(resolutions[2].getTime());
              data[2].readCount.should.equal(1);
              data[2].articleWordCount.should.equal(400);

              data[3].timestamp.getTime().should.equal(resolutions[3].getTime());
              data[3].readCount.should.equal(3);
              data[3].articleWordCount.should.equal(1200);
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
            Model.getAnalytics(null, new Date(resolutions[1].getTime() + period / 2), tldr1._id, function (err, data) {
              data.length.should.equal(2);
              data[0].timestamp.getTime().should.equal(resolutions[0].getTime());
              data[0].readCount.should.equal(1);
              data[0].articleWordCount.should.equal(400);
              data[1].timestamp.getTime().should.equal(resolutions[1].getTime());
              data[1].readCount.should.equal(2);
              data[1].articleWordCount.should.equal(800);
              _cb();
            });
          }
        , function (_cb) {
            Model.getAnalytics(new Date(resolutions[2].getTime() + period / 2), null, tldr1._id, function (err, data) {
              data.length.should.equal(1);
              data[0].timestamp.getTime().should.equal(resolutions[3].getTime());
              data[0].readCount.should.equal(3);
              data[0].articleWordCount.should.equal(1200);
              _cb();
            });
          }
        , function (_cb) {
            Model.getAnalytics(new Date(resolutions[1].getTime() + period / 2), new Date(resolutions[2].getTime() + period / 2), tldr1._id, function (err, data) {
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

    describe('Should be able to give you the analytics for multiple ids', function () {
      function doTest(Model, period, resolutions, cb) {
        async.waterfall([
          async.apply(asyncClockTick, period)
        , async.apply(addRead, Model, tldr1)
        , async.apply(addRead, Model, tldr3)
        , async.apply(addRead, Model, tldr1)
        , async.apply(addRead, Model, tldr2)
        , function (_cb) {
            Model.getAnalytics(new Date(resolutions[1].getTime() - period / 2), null, [tldr1._id, tldr3._id], function (err, data) {
              var dataForTldr1, dataForTldr3;

              data.length.should.equal(2);
              data[0].timestamp.getTime().should.equal(resolutions[1].getTime());
              data[1].timestamp.getTime().should.equal(resolutions[1].getTime());

              // Order is not assured
              if (data[0].tldr.toString() === tldr1._id.toString()) {
                dataForTldr1 = data[0]; dataForTldr3 = data[1];
              } else {
                dataForTldr1 = data[1]; dataForTldr3 = data[0];
              }

              dataForTldr1.tldr.toString().should.equal(tldr1._id.toString());
              dataForTldr1.readCount.should.equal(2);
              dataForTldr1.articleWordCount.should.equal(800);

              dataForTldr3.tldr.toString().should.equal(tldr3._id.toString());
              dataForTldr3.readCount.should.equal(1);
              dataForTldr3.articleWordCount.should.equal(700);
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
              userEvents[0].readCount.should.equal(2);
              userEvents[0].articleWordCount.should.equal(800);
              clock.tick(stayInPeriod);
              Model.addRead(tldr3, function (err) {   // Not written by user, so nothing to add for him
                Model.find({ user: user._id }, function (err, userEvents) {
                  userEvents.length.should.equal(1);
                  userEvents[0].user.toString().should.equal(user._id.toString());
                  userEvents[0].timestamp.getTime().should.equal(resolutionNow.getTime());
                  userEvents[0].readCount.should.equal(2);
                  userEvents[0].articleWordCount.should.equal(800);

                  Model.find({ user: userbis._id }, function (err, userEvents) {
                  userEvents.length.should.equal(1);
                  userEvents[0].user.toString().should.equal(userbis._id.toString());
                  userEvents[0].timestamp.getTime().should.equal(resolutionNow.getTime());
                  userEvents[0].readCount.should.equal(1);
                  userEvents[0].articleWordCount.should.equal(700);

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
              userEvents[0].readCount.should.equal(2);
              userEvents[0].articleWordCount.should.equal(900);
              clock.tick(goToNextPeriod);
              Model.addRead(tldr2, function (err) {
                Model.find({ user: user._id }, function (err, userEvents) {
                  userEvents.length.should.equal(2);

                  Model.findOne({ user: user._id, timestamp: resolutionNow }, function (err, userEvent) {
                    userEvent.user.toString().should.equal(user._id.toString());
                    userEvent.timestamp.getTime().should.equal(resolutionNow.getTime());
                    userEvent.readCount.should.equal(2);
                    userEvent.articleWordCount.should.equal(900);

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
            Model.getAnalytics(null, null, user._id, function (err, data) {
              data.length.should.equal(3);
              data[0].timestamp.getTime().should.equal(resolutions[0].getTime());
              data[0].readCount.should.equal(1);
              data[0].articleWordCount.should.equal(400);

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
            Model.getAnalytics(null, null, userbis._id, function (err, data) {
              data.length.should.equal(4);
              data[0].timestamp.getTime().should.equal(resolutions[0].getTime());
              assert.isUndefined(data[0].readCount);
              assert.isUndefined(data[0].articleWordCount);

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

});   // ==== End of 'Analytics' ==== //


describe('Test analytics with events', function () {
  var user, userbis, tldr1, tldr2, tldr3;

  function sendEventAndWait (event, data, wait, cb) {
    mqClient.emit(event, data);
    setTimeout(function () { cb(); }, wait);
  }

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

  describe('The tldr.read event updates the tldr and user analytics', function () {
    function doTest (resolution, done) {
      async.waterfall([
        function (cb) {
          TldrAnalytics[resolution].find({ tldr: tldr1._id }, function(err, analytics) {
            analytics.length.should.equal(0);
            cb();
          });
        }
      , function (cb) {
          UserAnalytics[resolution].find({ user: user._id }, function(err, analytics) {
            analytics.length.should.equal(1);
            assert.isUndefined(analytics[0].readCount);
            assert.isUndefined(analytics[0].articleWordCount);
            cb();
          });
        }
      , async.apply(sendEventAndWait, 'tldr.read', { tldr: tldr1 }, 20)
      , function (cb) {
          TldrAnalytics[resolution].find({ tldr: tldr1._id }, function(err, analytics) {
            analytics.length.should.equal(1);
            analytics[0].readCount.should.equal(1);
            analytics[0].articleWordCount.should.equal(400);
            cb();
          });
        }
      , function (cb) {
          UserAnalytics[resolution].find({ user: user._id }, function(err, analytics) {
            analytics.length.should.equal(1);
            analytics[0].readCount.should.equal(1);
            analytics[0].articleWordCount.should.equal(400);
            cb();
          });
        }
      ], done);
    }

    it('daily', function (done) { doTest('daily', done); });
    it('monthly', function (done) { doTest('monthly', done); });
  });

  describe('The tldr.thank event updates the tldr and user analytics', function () {
    function doTest (resolution, done) {
      async.waterfall([
        function (cb) {
          TldrAnalytics[resolution].find({ tldr: tldr3._id }, function(err, analytics) {
            analytics.length.should.equal(0);
            cb();
          });
        }
      , function (cb) {
          UserAnalytics[resolution].find({ user: userbis._id }, function(err, analytics) {
            analytics.length.should.equal(1);
            assert.isUndefined(analytics[0].thanks);
            cb();
          });
        }
      , async.apply(sendEventAndWait, 'tldr.thank', { thanker: user, tldr: tldr3 }, 20)
      , function (cb) {
          TldrAnalytics[resolution].find({ tldr: tldr3._id }, function(err, analytics) {
            analytics.length.should.equal(1);
            analytics[0].thanks.should.equal(1);
            cb();
          });
        }
      , function (cb) {
          UserAnalytics[resolution].find({ user: userbis._id }, function(err, analytics) {
            analytics.length.should.equal(1);
            analytics[0].thanks.should.equal(1);
            cb();
          });
        }
      ], done);
    }

    it('daily', function (done) { doTest('daily', done); });
    it('monthly', function (done) { doTest('monthly', done); });
  });

  describe('The tldr.created event makes the analytics engine remember the ids of those tldrs, per user', function () {
    function doTest (resolution, done) {
      async.waterfall([   // The tldr.created event is already emitted on tldr creation we can test it right away
        function (cb) {
          UserAnalytics[resolution].find({ user: user._id }, function(err, analytics) {
            analytics.length.should.equal(1);
            analytics[0].tldrsCreated.length.should.equal(2);
            analytics[0].tldrsCreated.should.include(tldr1._id);
            analytics[0].tldrsCreated.should.include(tldr2._id);
            cb();
          });
        }
      , function (cb) {
          UserAnalytics[resolution].find({ user: userbis._id }, function(err, analytics) {
            analytics.length.should.equal(1);
            analytics[0].tldrsCreated.length.should.equal(1);
            analytics[0].tldrsCreated.should.include(tldr3._id);
            cb();
          });
        }
      ], done);
    }

    it('daily', function (done) { doTest('daily', done); });
    it('monthly', function (done) { doTest('monthly', done); });
  });

});   // ==== End of 'Test analytics with events' ====  //


describe('Embed analytics', function () {

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
    , async.apply(theRemove, EmbedAnalytics)
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

  it('Should create the data point if it doesnt exist and create its first read date', function (done) {
    EmbedAnalytics.addEmbedRead('http://www.someblog.com/thearticle', tldr2._id, function () {
      EmbedAnalytics.find({}, function (err, datapoints) {
        datapoints.length.should.equal(1);
        datapoints[0].firstRead.getTime().should.equal(fakeNow.getTime());
        datapoints[0].lastRead.getTime().should.equal(fakeNow.getTime());
        datapoints[0].hostname.should.equal('www.someblog.com');
        datapoints[0].pageUrl.should.equal('http://www.someblog.com/thearticle');
        datapoints[0].pageNormalizedUrl.should.equal('http://someblog.com/thearticle');
        datapoints[0].tldrId.toString().should.equal(tldr2._id.toString());
        datapoints[0].readCount.should.equal(1);

        done();
      });
    });
  });

  it('Should add reads in the same data point for the same couple tldrId normalizedUrl', function (done) {
    EmbedAnalytics.addEmbedRead('http://www.someblog.com/thearticle', tldr2._id, function () {
      clock.tick(10000);
      EmbedAnalytics.addEmbedRead('http://www.someblog.com/thearticle', tldr2._id, function () {
        EmbedAnalytics.find({}, function (err, datapoints) {
          datapoints.length.should.equal(1);
          datapoints[0].firstRead.getTime().should.equal(fakeNow.getTime());
          datapoints[0].lastRead.getTime().should.equal(fakeNow.getTime() + 10000);
          datapoints[0].hostname.should.equal('www.someblog.com');
          datapoints[0].pageUrl.should.equal('http://www.someblog.com/thearticle');
          datapoints[0].pageNormalizedUrl.should.equal('http://someblog.com/thearticle');
          datapoints[0].tldrId.toString().should.equal(tldr2._id.toString());
          datapoints[0].readCount.should.equal(2);

          done();
        });
      });
    });
  });

  it('Should aggregate by normalized url, not url', function (done) {
    EmbedAnalytics.addEmbedRead('http://www.someblog.com/thearticle', tldr2._id, function () {
      clock.tick(10000);
      EmbedAnalytics.addEmbedRead('http://someblog.com/thearticle', tldr2._id, function () {
        EmbedAnalytics.find({}, function (err, datapoints) {
          datapoints.length.should.equal(1);
          datapoints[0].firstRead.getTime().should.equal(fakeNow.getTime());
          datapoints[0].lastRead.getTime().should.equal(fakeNow.getTime() + 10000);
          datapoints[0].hostname.should.equal('someblog.com');
          datapoints[0].pageUrl.should.equal('http://someblog.com/thearticle');
          datapoints[0].pageNormalizedUrl.should.equal('http://someblog.com/thearticle');
          datapoints[0].tldrId.toString().should.equal(tldr2._id.toString());
          datapoints[0].readCount.should.equal(2);

          done();
        });
      });
    });
  });

  it('Dont aggregate in the same point if the tldrids or normalized urls are different', function (done) {
    EmbedAnalytics.addEmbedRead('http://www.someblog.com/thearticle', tldr2._id, function () {
      EmbedAnalytics.addEmbedRead('http://www.someblog.com/thearticle', tldr3._id, function () {
        EmbedAnalytics.addEmbedRead('http://www.someotherblog.com/thearticle', tldr3._id, function () {
          EmbedAnalytics.find({}, function (err, datapoints) {
            datapoints.length.should.equal(3);
            datapoints[0].firstRead.getTime().should.equal(fakeNow.getTime());
            datapoints[0].lastRead.getTime().should.equal(fakeNow.getTime());
            datapoints[0].hostname.should.equal('www.someblog.com');
            datapoints[0].pageUrl.should.equal('http://www.someblog.com/thearticle');
            datapoints[0].pageNormalizedUrl.should.equal('http://someblog.com/thearticle');
            datapoints[0].tldrId.toString().should.equal(tldr2._id.toString());
            datapoints[0].readCount.should.equal(1);

            datapoints[1].firstRead.getTime().should.equal(fakeNow.getTime());
            datapoints[1].lastRead.getTime().should.equal(fakeNow.getTime());
            datapoints[1].hostname.should.equal('www.someblog.com');
            datapoints[1].pageUrl.should.equal('http://www.someblog.com/thearticle');
            datapoints[1].pageNormalizedUrl.should.equal('http://someblog.com/thearticle');
            datapoints[1].tldrId.toString().should.equal(tldr3._id.toString());
            datapoints[1].readCount.should.equal(1);

            datapoints[2].firstRead.getTime().should.equal(fakeNow.getTime());
            datapoints[2].lastRead.getTime().should.equal(fakeNow.getTime());
            datapoints[2].hostname.should.equal('www.someotherblog.com');
            datapoints[2].pageUrl.should.equal('http://www.someotherblog.com/thearticle');
            datapoints[2].pageNormalizedUrl.should.equal('http://someotherblog.com/thearticle');
            datapoints[2].tldrId.toString().should.equal(tldr3._id.toString());
            datapoints[2].readCount.should.equal(1);

            done();
          });
        });
      });
    });
  });

});   // ==== End of 'Embed analytics' ==== //



