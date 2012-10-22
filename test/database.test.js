/**
 * Database tests
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */


var should = require('chai').should()
  , assert = require('chai').assert
  , sinon = require('sinon')
  , mongoose = require('mongoose') // Mongoose ODM to Mongo
  , models = require('../lib/models')
  , Tldr = models.Tldr
  , User = models.User
  , server = require('../server')
  , db = server.db
  , async = require('async');





/**
 * Tests
 */


describe('Database', function () {

  before(function (done) {
    db.connectToDatabase(done);

  });

  after(function (done) {
    db.closeDatabaseConnection(done);
  });

  beforeEach(function (done) {

    // dummy models
    var tldrData1 = {url: 'http://needforair.com/nutcrackers', title:'nutcrackers', summaryBullets: ['Awesome Blog'], resourceAuthor: 'Charles', resourceDate: new Date(), createdAt: new Date(), updatedAt: new Date()}
      , tldrData2 = {url: 'http://avc.com/mba-monday', title:'mba-monday', summaryBullets: ['Fred Wilson is my God'], resourceAuthor: 'Fred', resourceDate: new Date(), createdAt: new Date(), updatedAt: new Date()}
      , tldrData3 = {url: 'http://bothsidesofthetable.com/deflationnary-economics', title: 'deflationary economics', summaryBullets: ['Sustering is my religion'], resourceAuthor: 'Mark', resourceDate: new Date(), createdAt: new Date(), updatedAt: new Date()}
      , user, userData = {email: "user1@nfa.com", username: "UserOne", password: "supersecret"};

    function theRemove(collection, cb) { collection.remove({}, function(err) { cb(err); }) }   // Remove everything from collection

    async.waterfall([
      async.apply(theRemove, User)
    , async.apply(theRemove, Tldr)
    ], function(err) {
         User.createAndSaveInstance(userData, function (err, user) {
           async.waterfall([
             function(cb) { Tldr.createAndSaveInstance(tldrData1, user, function(err, tldr) { cb(); }) }
           , function(cb) { Tldr.createAndSaveInstance(tldrData2, user, function(err, tldr) { cb(); }) }
           , function(cb) { Tldr.createAndSaveInstance(tldrData3, user, function(err, tldr) { cb(); }) }
           ], done);   // Finish by saving the number of tldrs
         });
       });
  });

  afterEach(function (done) {

    Tldr.remove({}, function (err) {
      if (err) {return done(err);}
      done();
    });

  });

  // Check that all 3 records are in the db
  it('should return full collection', function (done) {

    Tldr.find(null, function (err, docs) {
      if (err) { return done(err); }
      docs.should.have.length(3);
      done();
    });

  });

  // Get tldr with id 1
  it('should return a tldr for an existing id', function (done) {

    var url = 'http://needforair.com/nutcrackers';

    Tldr.find( {url: url}, function (err, docs) {
      if (err) { return done(err); }
      var tldr = docs[0];
      tldr.title.should.equal('nutcrackers');
      done();
    });

  });

});


