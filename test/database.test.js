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

describe('TldrModel', function () {
  it('should have a constructor', function () {
    var tldr = models.createTldr('http://needforair.com/nutcrackers', 'Awesome Blog');

    tldr.should.have.property('url');
    tldr.should.have.property('summary');
    tldr.url.should.equal('http://needforair.com/nutcrackers');
    tldr.summary.should.equal('Awesome Blog');
  });
});

describe('Database', function () {

	before(function (done) {

		// dummy models
    var tldr1 = models.createTldr('http://needforair.com/nutcrackers',
                                  'Awesome Blog')
      , tldr2 = models.createTldr('http://avc.com/mba-monday', 
                                  'Fred Wilson is my God')
      , tldr3 = models.createTldr('http://bothsidesofthetable.com/deflationnary-economics',
                                  'Sustering is my religion');

		
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

