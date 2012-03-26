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
  , server = require('../server');




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

// Test GET requests
describe('Get Requests', function () {

  // The done arg is very important ! If absent tests run synchronously
  // that means there is n chance you receive a response to your request
  // before mocha quits 

  it('should get the first summary', function (done) {
    client.get('/tldrs/1', function (err, req, res, obj) {
			obj._id.should.equal(1);
      done();
    });
  });

  it('should respond with 404', function (done) {
    client.get('/tldrs/100', function (err, req, res, obj) {
      res.statusCode.should.equal(404);
      done();
    });
  });

  it('should not be allowed to dump full db and respond with 403', function (done) {
    client.get('/tldrs', function (err, req, res, obj) {
      res.statusCode.should.equal(403);
      done();
    });
  });

  it('should respond with 404', function (done) {
    client.get('/*', function (err, req, res, obj) {
      res.statusCode.should.equal(404);
      done();
    });
  });

});


