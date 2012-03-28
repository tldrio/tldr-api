/**
 * Server Tests
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */


var should = require('chai').should()
  , assert = require('chai').assert
  , restify = require('restify')
  , winston = require('../lib/logger.js').winston // Custom logger built with Winston
  , bunyan = require('../lib/logger.js').bunyan // Audit logger for restify
  , server = require('../server')
	, TldrModel = require('../models').TldrModel;




/*
 * Set up test
 */

//create client to test api
client = restify.createJsonClient({
  url: 'http://localhost:' + 8686,
});
//start server
server.listen(8686, function () {
  winston.info('listening to ' + server.url);
});






/**
 * Tests
 */

describe('Webserver', function () {

  // The done arg is very important ! If absent tests run synchronously
  // that means there is n chance you receive a response to your request
  // before mocha quits 

  // Test GET requests
  describe('should handle GET request for', function () {
    
    it('an existing tldr', function (done) {
      client.get('/tldrs/1', function (err, req, res, obj) {
        obj._id.should.equal(1);
        done();
      });
    });

    it('a non existing tldr', function (done) {
      client.get('/tldrs/100', function (err, req, res, obj) {
        res.statusCode.should.equal(404);
        done();
      });
    });

    it('all the tldrs', function (done) {
      client.get('/tldrs', function (err, req, res, obj) {
        res.statusCode.should.equal(403);
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
      
      var tldr = new TldrModel({
        url: 'http://youporn.com',
        summary: 'Handjob',
      });
      client.post('/tldrs', tldr, function (err, req, res,obj) {
        res.statusCode.should.equal(200);
        done();
      });
    });

  });
});


