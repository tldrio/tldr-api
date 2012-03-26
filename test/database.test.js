/**
 *  Database tests
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */


var should = require('chai').should()
  , assert = require('chai').assert
  , restify = require('restify')
  , winston = require('../lib/logger.js').winston // Custom logger built with Winston
  , bunyan = require('../lib/logger.js').bunyan // Audit logger for restify
  , mongoose = require('mongoose') // Mongoose ODM to Mongo
  , db = mongoose.connect('mongodb://localhost/datastore-test')
  , models = require('../models')
	, TldrModel = models.TldrModel
  , server = require('../server');





/**
 * Tests
 */

describe('Basic operations', function () {

	before(function (done) {

		// dummy models
		var tldr1 = new TldrModel({
			_id: 1,
			url: 'http://needforair.com',
			summary: 'No I Need for Space',
		})
			,	tldr2 = new TldrModel({
			_id: 2,
			url: 'http://www.avc.com',
			summary: 'Fred Wilson is my god',
		})
			,	tldr3 = new TldrModel({
			_id: 3,
			url: 'http://www.bothsidesofthetable.com',
			summary: 'Sustering is my religion',
		});
		
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

	// Check that all 3 records are in the db
  it('should have 3 documents', function (done) {
    TldrModel.find(null, function (err, docs) {
			docs.should.have.length(3);
			done();
    });
  });

	// Get tldr with id 1
	it('should return a tldr with url http://needforair.com', function (done) {
	  TldrModel.find( {_id: 1}, function (err, docs) {
			docs[0].url.should.equal('http://needforair.com');
			done();
	  });
	});


});


