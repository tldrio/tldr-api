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
    var tldr1 = TldrModel.createInstance({_id: 'http://needforair.com/nutcrackers'
                                         , title: 'Blog NFA'
                                         , summary: 'Awesome Blog'})
      , tldr2 = TldrModel.createInstance({_id: 'http://avc.com/mba-monday'
                                         , title: 'Blog AVC'
                                         , summary: 'Fred Wilson is my God'})
      , tldr3 = TldrModel.createInstance({_id: 'http://bothsidesofthetable.com/deflationnary-economics'
                                         , title: 'Deflat Eco'
                                         , summary: 'Sustering is my religion'});

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

    var _id = 'http://needforair.com/nutcrackers';

	  TldrModel.find( {_id: _id}, function (err, docs) {
      if (err) { throw done(err); }
      var tldr = docs[0];
			tldr.title.should.equal('Blog NFA');
			done();
	  });

	});

});


