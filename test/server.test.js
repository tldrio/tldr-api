/**
 * Server Tests
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */


var should = require('chai').should()
  , assert = require('chai').assert
  , restify = require('restify')
  , winston = require('../lib/logger').winston // Custom logger built with Winston
  , bunyan = require('../lib/logger').bunyan // Audit logger for restify
  , server = require('../server')
  , models = require('../models')
  , db = require('../lib/db')
  , mongoose = require('mongoose')
  , TldrModel = models.TldrModel;




/*
 * Set up test
 */

//create client to test api
client = restify.createJsonClient({
  url: 'http://localhost:' + 8686,
});
//start server
server.listen(8686, function () {
});






/**
 * Tests
 */

describe('Webserver', function () {

  // The done arg is very important ! If absent tests run synchronously
  // that means there is n chance you receive a response to your request
  // before mocha quits 

  before(function (done) {
    db.connectToDatabase(done);
  });

  after(function (done) {

    db.closeDatabaseConnection(done);
  });

	beforeEach(function (done) {

    winston.info('tata');
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

  // Test GET requests
  describe('should handle GET request for', function () {

    it('an existing tldr', function (done) {
      client.get('/tldrs/c63588884fecf318d13fc3cf3598b19f4f461d21', function (err, req, res, obj) {
        obj.url.should.equal('http://needforair.com/nutcrackers');
        done();
      });
    });

    it('a non existing tldr', function (done) {
      client.get('/tldrs/3niggas4bitches', function (err, req, res, obj) {
        var response = JSON.parse(res.body);
        res.statusCode.should.equal(404);
        response.should.have.ownProperty('code');
        response.code.should.equal('ResourceNotFound');
        done();
      });

    });
    it('all the tldrs', function (done) {
      client.get('/tldrs', function (err, req, res, obj) {
        var response = JSON.parse(res.body);
        res.statusCode.should.equal(403);
        response.should.have.ownProperty('code');
        response.code.should.equal('NotAuthorized');
        done();
      });
    });

    it('a non existing route', function (done) {
      client.get('/*', function (err, req, res, obj) {
        res.statusCode.should.equal(404);
        done();
      });
    });
  });

  //Test POST Requests
  describe('should handle POST request for', function () {

    it('adding a new tldr', function (done) {
      var tldrData = {url: 'http://www.youporn.com/milf',
                      summary: 'Sluts and cockslapers'}
        , tldr = models.createTldr({url: tldrData.url, summary: tldrData.summary});
        
      client.post('/tldrs', tldrData, function (err, req, res, obj) {
        res.statusCode.should.equal(200);
        obj._id.should.equal(tldr._id);
        obj.summary.should.equal(tldrData.summary);
        done();
      });
    });

    it('updating an existing tldr', function (done) {
      var tldrUpdates = {summary: 'This blog smells like shit'};

      client.post('/tldrs/c63588884fecf318d13fc3cf3598b19f4f461d21', tldrUpdates, function (err, req, res, obj) {
        res.statusCode.should.equal(200);
        obj._id.should.equal('c63588884fecf318d13fc3cf3598b19f4f461d21');
        obj.summary.should.equal('This blog smells like shit');
        done();
      });
    });

  });

});

