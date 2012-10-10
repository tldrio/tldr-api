/**
 * Models tests (all methods that are not specific to one model)
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */


var should = require('chai').should()
  , assert = require('chai').assert
  , _ = require('underscore')
  , sinon = require('sinon')
  , mongoose = require('mongoose') // ODM for Mongo
  , models = require('../lib/models')
  , User = models.User
  , Tldr = models.Tldr
  , config = require('../lib/config')
  , DbObject = require('../lib/db')
  , db = new DbObject(config.dbHost, config.dbName, config.dbPort);


/**
 * Tests
 */


describe('Models', function () {

  before(function (done) {
    db.connectToDatabase(done);
    //done();
  });

  after(function (done) {
    db.closeDatabaseConnection(done);
  });

  beforeEach(function (done) {
    User.remove( function (err) {
      if (err) {throw done(err);}
      Tldr.remove(function (err) {
        if (err) {throw done(err);}
        done();
      });
    });
  });




  describe('getDuplicateErrorNiceFormat', function() {
    it('should correctly extract the duplicated field if the error is formatted as expected', function (done) {
      var error1 = { name: 'MongoError'   // An actual duplicate error on update
                   , err: 'E11000 duplicate key error index: test-db.users.$username_1  dup key: { : "ANOTHER" }'
                   , code: 11001
                   , n: 0
                   , connectionId: 64
                   , ok: 1 }
        , error2 = { name: 'MongoError'   // An actual duplicate error on create
                   , err: 'E11000 duplicate key error index: dev-db.users.$email_1  dup key: { : "a@b.com" }'
                   , code: 11000
                   , n: 0
                   , connectionId: 66
                   , ok: 1 };

      models.getDuplicateField(error1).should.equal("username");
      models.getDuplicateField(error2).should.equal("email");

      done();
    });

    it('should throw an error if the function is called on a non duplicate error', function (done) {
      var error1 = { name: 'MongoError'   // An actual duplicate error on update
                   , err: 'E11000 duplicate key error index: test-db.users.$username_1  dup key: { : "ANOTHER" }'
                   , code: 10999
                   , n: 0
                   , connectionId: 64
                   , ok: 1 };

      function testFunc () { models.getDuplicateField(error1); }
      testFunc.should.throw();

      done();
    });

    it('Should return "unknown" if the error is not formatted as expected', function (done) {
      var error1 = { name: 'MongoError'   // An actual duplicate error on update
                   , err: 'E11000 duplicate key erro_r index: test-db.users.$username_1  dup key: { : "ANOTHER" }'
                   , code: 11000
                   , n: 0
                   , connectionId: 64
                   , ok: 1 };

      models.getDuplicateField(error1).should.equal("unknown");

      done();
    });


  });


});
