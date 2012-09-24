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
  , server = require('../server')
  , db = server.db
  , async = require('async');





/**
 * Tests
 */


describe.only('UserHistory', function () {

  before(function (done) {
    db.connectToDatabase(done);
  });

  after(function (done) {
    db.closeDatabaseConnection(done);
  });

  beforeEach(function (done) {
    function theRemove(collection, cb) { collection.remove({}, function(err) { cb(err); }) }   // Remove everything from collection

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

  });   // ==== End of 'Basic behaviour' ==== //
});

