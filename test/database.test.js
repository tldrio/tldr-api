/**
 * Database tests
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */


var should = require('chai').should()
  , assert = require('chai').assert
  , restify = require('restify')
  , sinon = require('sinon')
  , winston = require('../lib/logger').winston // Custom logger built with Winston
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

describe('TldrModel', function () {
  describe('#createTldr', function () {

    it('should create a tldr given {url, summary}', function () {
      var tldr = models.createTldr({url: 'http://needforair.com/nutcrackers', summary: 'Awesome Blog'});

      tldr.should.have.property('url');
      tldr.should.have.property('summary');
      tldr.should.have.property('hostname');
      tldr.url.should.equal('http://needforair.com/nutcrackers');
      tldr.summary.should.equal('Awesome Blog');
      tldr.hostname.should.equal('needforair.com');
      tldr._id.should.equal('c63588884fecf318d13fc3cf3598b19f4f461d21');
    });

    it('should handle no args', function (done) {
      try {
        models.createTldr();
      } catch(err) {
        err.should.be.an.instanceOf(customErrors.MissingArgumentError);
        done();
      }
    });

    it('should hanlde missing summary arg ', function (done) {
      try {
        models.createTldr({url: 'bla'});
      } catch(err) {
        err.should.be.an.instanceOf(customErrors.MissingArgumentError);
        done();
      }
    });

    it('should handle missing url arg', function (done) {
      try {
        models.createTldr({summary: 'coin'});
      } catch(err) {
        err.should.be.an.instanceOf(customErrors.MissingArgumentError);
        done();
      }
    });

  });
});

describe('Database', function () {

  before(function (done) {
    db.connectToDatabase(done);

  });

  after(function (done) {
    db.closeDatabaseConnection(done);
  });

	beforeEach(function (done) {
		// dummy models
    var tldr1 = models.createTldr({url: 'http://needforair.com/nutcrackers',
                                   summary: 'Awesome Blog'})
      , tldr2 = models.createTldr({url: 'http://avc.com/mba-monday', 
                                   summary: 'Fred Wilson is my God'})
      , tldr3 = models.createTldr({url: 'http://bothsidesofthetable.com/deflationnary-economics',
                                   summary: 'Sustering is my religion'});
		
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

