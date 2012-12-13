/**
 * User tests
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */


var should = require('chai').should()
  , assert = require('chai').assert
  , _ = require('underscore')
  , i18n = require('../lib/i18n')
  , mongoose = require('mongoose') // ODM for Mongo
  , models = require('../lib/models')
  , User = models.User
  , Notification = models.Notification
  , Tldr = models.Tldr
  , config = require('../lib/config')
  , notificator = require('../lib/notificator')
  , DbObject = require('../lib/db')
  , db = new DbObject(config.dbHost, config.dbName, config.dbPort)
  , async = require('async')
  , user
  , tldr;



/**
 * Tests
 */


describe('Notification', function () {

  before(function (done) {
    db.connectToDatabase(done);
  });

  after(function (done) {
    db.closeDatabaseConnection(done);
  });

  beforeEach(function (done) {
    Notification.remove( function (err) {
      if (err) {throw done(err);}
      User.remove( function (err) {
        if (err) {throw done(err);}
        Tldr.remove( function(err) {
          if (err) {throw done(err);}
          User.createAndSaveInstance({ username: "tldrio", password: "password", email: "valid@email.com" }, function(err, _user) {
            user = _user;
            Tldr.createAndSaveInstance( { url: 'http://needforair.com/nutcrackers', title: 'Blog', summaryBullets: ['bullet1','bullet2'], } , user, function (err, _tldr) {
              tldr = _tldr;
              done();
            });
          });
        });
      });
    });
  });



  describe('Notifs updates', function() {

    it('should mark as seen notifs with corresponding method', function (done) {
      var notifData = { from: '507eda94cb0c70d81100000c'
                      , to : '5047602871993defaa000001'
                      , tldr: '507edb3fcb0c70d81100006a'
                      , type: 'read'
                      };

      Notification.createAndSaveInstance(notifData, function(err, notif) {
        assert.isNull(err);
        notif.unseen.should.be.true;

        notif.markAsSeen(function(err, notif) {
          notif.from.toString().should.equal('507eda94cb0c70d81100000c');
          notif.to.toString().should.equal('5047602871993defaa000001');
          notif.tldr.toString().should.equal('507edb3fcb0c70d81100006a');
          notif.unseen.should.be.false;

          done();
        });
      });
    });

  });


  describe('Notifs creation', function () {

    it('should respect the unicity constraint type-tldr-from when from is identified', function (done) {
      var notifData = { from: '507eda94cb0c70d81100000c'
                      , to : '5047602871993defaa000001'
                      , tldr: '507edb3fcb0c70d81100006a'
                      , type: 'read'
                      };

      Notification.createAndSaveInstance(notifData, function(err, notif) {
        assert.isNull(err);
        Notification.createAndSaveInstance(notifData, function(err, notif) {
          err.code.should.equal(11000); // Mongo error code for duplicated key
          done();
        });

      });
    });

    it('should not do anything when publishing a notif with same from and to', function (done) {

      notificator.receiveNotification({ type: 'read'
                          , from: user
                          , tldr: tldr
                          , to: tldr.creator
                          });
       Notification.find({}, function (err, notifs) {

         notifs.should.be.empty;
         done();

       });

    });

    it('should assign a notif to the right person when publishing an event', function (done) {
      notificator.receiveNotification({ type: 'read'
                          , from: undefined
                          , tldr: tldr
                          // all contributors instead of creator only ?? we keep creator for now as there a very few edits
                          , to: tldr.creator
                          }, function ( err, _user) {
        _user.notifications.length.should.be.equal(1);
        done();
      });
    });


  });


});
