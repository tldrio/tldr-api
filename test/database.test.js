/**
 * Database tests
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */


var should = require('chai').should()
  , assert = require('chai').assert
  , restify = require('restify')
  , sinon = require('sinon')
  , bunyan = require('../lib/logger').bunyan // Audit logger for restify
  , mongoose = require('mongoose') // Mongoose ODM to Mongo
  , models = require('../models')
  , db = require('../lib/db')
	, TldrModel = models.TldrModel
  , server = require('../server')
  , customErrors = require('../lib/errors');





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
    var tldr1 = new TldrModel({url: 'http://needforair.com/nutcrackers', summary: 'Awesome Blog'})
      , tldr2 = new TldrModel({url: 'http://avc.com/mba-monday', summary: 'Fred Wilson is my God'})
      , tldr3 = new TldrModel({url: 'http://bothsidesofthetable.com/deflationnary-economics', summary: 'Sustering is my religion'});

    tldr1.craftInstance();
    tldr2.craftInstance();
    tldr3.craftInstance();
		
		// clear database and repopulate
		TldrModel.remove(null, function (err) {
		  if (err) {throw done(err);}
			tldr1.save(	function (err) {
				if (err) {throw done(err); }
			  tldr2.save( function (err) {
					if (err) {throw done(err); }
			    tldr3.save( function (err) {
			      if (err) {throw done(err); }
						done();
			    });
			  });
			});
		});

	});

  afterEach(function (done) {
    TldrModel.remove(null, function (err) {
      if (err) {throw done(err);}               
      done();
    });
  });

	// Check that all 3 records are in the db
  it('should return full collection', function (done) {
    TldrModel.find(null, function (err, docs) {
      if (err) { throw done(err); }
			docs.should.have.length(3);
			done();
    });
  });

	// Get tldr with id 1
	it('should return a tldr for an existing id', function (done) {
    var htldrId = 'c63588884fecf318d13fc3cf3598b19f4f461d21';
	  TldrModel.find( {_id: htldrId}, function (err, docs) {
      if (err) { throw done(err); }
      var tldr = docs[0];
			tldr.url.should.equal('http://needforair.com/nutcrackers');
			tldr.hostname.should.equal('needforair.com');
			done();
	  });
	});
});


