/**
 * Models tests (all methods that are not specific to one model)
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */


var should = require('chai').should()
  , assert = require('chai').assert
  , _ = require('underscore')
  , sinon = require('sinon')
  , bunyan = require('../lib/logger').bunyan // Audit logger 
  , mongoose = require('mongoose') // ODM for Mongo
  , models = require('../models')
  , User = models.User
  , Tldr = models.Tldr
  , server = require('../server')
  , db = server.db;



/**
 * Tests
 */


describe('Models', function () {

  before(function (done) {
    db.connectToDatabase(done);
  });

  after(function (done) {
    db.closeDatabaseConnection(done);
  });

  beforeEach(function (done) {
    User.remove( function (err) {
      if (err) {throw done(err);}
      done();
    });
  });


  describe('setTldrCreator', function () {

    it('Should work correctly', function (done) {
      var user = new User({ username: 'A name'
                          , email: 'valid@email.com'
                          , password: 'supersecret!'
                          });

      user.save(function(err) {
        assert.isNull(err);
        done();
      });
    });

  });


});
