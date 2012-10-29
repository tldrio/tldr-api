/**
 * User History tests
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */


var should = require('chai').should()
  , assert = require('chai').assert
  , _ = require('underscore')
  , i18n = require('../lib/i18n')
  , mongoose = require('mongoose')
  , models = require('../lib/models')
  , User = models.User
  , UserHistory = models.UserHistory
  , config = require('../lib/config')
  , DbObject = require('../lib/db')
  , db = new DbObject(config.dbHost, config.dbName, config.dbPort)
  , async = require('async');



/**
 * Tests
 */


describe('UserHistory', function () {

  before(function (done) {
    db.connectToDatabase(done);
    //done();
  });

  after(function (done) {
    db.closeDatabaseConnection(done);
  });

  beforeEach(function (done) {
    function theRemove(collection, cb) { collection.remove({}, function(err) { cb(err); }); }   // Remove everything from collection

    async.waterfall([
      async.apply(theRemove, User)
    , async.apply(theRemove, UserHistory)
    ], done);
  });


  describe('Basic behaviour', function () {

    it('Should create an history thats only the empty actions array', function (done) {
      var history = new UserHistory();
      history.actions.length.should.equal(0);
      done();
    });

    it('Should push actions with the saveAction method', function (done) {
      var history = new UserHistory();

      function saveAction (type, data, cb) {
        history.saveAction(type, data, function (err, his) {
          cb(err);
        });
      }

      async.waterfall([
        async.apply(saveAction, 'one type', 'some data')
      , async.apply(saveAction, 'another type', 'another data')
      , async.apply(saveAction, 'one type', 'blip blop')
      , function (cb) {
          history.actions[0].type.should.equal('one type');
          history.actions[0].data.should.equal('blip blop');
          history.actions[1].type.should.equal('another type');
          history.actions[1].data.should.equal('another data');
          history.actions[2].type.should.equal('one type');
          history.actions[2].data.should.equal('some data');
          cb();
        }
      ], done);
    });

  });   // ==== End of 'Basic behaviour' ==== //
});

