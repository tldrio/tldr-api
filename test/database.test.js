/**
 * Database tests
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */


var should = require('chai').should()
  , assert = require('chai').assert
  , sinon = require('sinon')
  , bunyan = require('../lib/logger').bunyan // Audit logger 
  , mongoose = require('mongoose') // Mongoose ODM to Mongo
  , models = require('../models')
  , db = require('../lib/db')
	, TldrModel = models.TldrModel
  , server = require('../server');





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
    var tldr1 = new TldrModel({url: 'http://needforair.com/nutcrackers', title:'nutcrackers', summaryBullets: ['Awesome Blog'], resourceAuthor: 'Charles', resourceDate: new Date(), createdAt: new Date(), updatedAt: new Date()})
      , tldr2 = new TldrModel({url: 'http://avc.com/mba-monday', title:'mba-monday', summaryBullets: ['Fred Wilson is my God'], resourceAuthor: 'Fred', resourceDate: new Date(), createdAt: new Date(), updatedAt: new Date()})
      , tldr3 = new TldrModel({url: 'http://bothsidesofthetable.com/deflationnary-economics', title: 'deflationary economics', summaryBullets: ['Sustering is my religion'], resourceAuthor: 'Mark', resourceDate: new Date(), createdAt: new Date(), updatedAt: new Date()});

    // clear database and repopulate
    TldrModel.remove({}, function (err) {
      if (err) {return done(err);}
      tldr1.save(function (err) {
        if (err) {return done(err); }
        tldr2.save( function (err) {
          if (err) {return done(err); }
          tldr3.save( function (err) {
            if (err) {return done(err); }
            done();
          });
        });
      });
    });

  });

  afterEach(function (done) {

    TldrModel.remove({}, function (err) {
      if (err) {return done(err);}
      done();
    });

  });

  // Check that all 3 records are in the db
  it('should return full collection', function (done) {

    TldrModel.find(null, function (err, docs) {
      if (err) { return done(err); }
      docs.should.have.length(3);
      done();
    });

  });

  // Get tldr with id 1
  it('should return a tldr for an existing id', function (done) {

    var url = 'http://needforair.com/nutcrackers';

    TldrModel.find( {url: url}, function (err, docs) {
      if (err) { return done(err); }
      var tldr = docs[0];
      tldr.title.should.equal('nutcrackers');
      done();
    });

  });

});


