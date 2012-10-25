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
  , Notification = require('../lib/models').Notification
  , config = require('../lib/config')
  , DbObject = require('../lib/db')
  , db = new DbObject(config.dbHost, config.dbName, config.dbPort)
  , async = require('async');



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
        done();
    });
  });



  describe('should update the updatable fields ', function() {

    it('should update only the unseen fields', function (done) {
      var notifData = { from: '507eda94cb0c70d81100000c'
                      , to : '5047602871993defaa000001'
                      , tldr: '507edb3fcb0c70d81100006a'
                      , type: 'read'
                      }
        , updateData = { from: '507eda94cb0c70d81100000d'
                       , to : '5047602871993defaa00000a'
                       , tldr: '507edb3fcb0c70d81100006b'
                       , type: 'like'
                       , unseen: false
                       };

      Notification.createAndSaveInstance(notifData, function(err, notif) {
        assert.isNull(err);
        notif.unseen.should.be.true;

        notif.updateStatus(updateData, function(err, notif) {
          notif.from.toString().should.equal('507eda94cb0c70d81100000c');
          notif.to.toString().should.equal('5047602871993defaa000001');
          notif.tldr.toString().should.equal('507edb3fcb0c70d81100006a');
          notif.unseen.should.be.false;

          done();
        });
      });
    });

  });

});
