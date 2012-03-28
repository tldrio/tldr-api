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
describe('GET', function () {

  // The done arg is very important ! If absent tests run synchronously
  // that means there is n chance you receive a response to your request
  // before mocha quits 

  it('an existing tldr', function (done) {
    client.get('/tldrs/f795b55c5888074df9b9005b4583ece878f40f4a', function (err, req, res, obj) {
      obj.url.should.equal('needforair.com');
      done();
    });
  });

  it('a non existing tldr', function (done) {
    client.get('/tldrs/3niggas4bitches', function (err, req, res, obj) {
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


