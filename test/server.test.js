/*!
 *  Tests for Restify Server
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */


/***********************************/
/* Require dependencies            */
/***********************************/

var should = require('chai').should(),
    assert = require('chai').assert,
    restify = require('restify'),
    server = require('../server.js'),
    config = require('../lib/config.js'),
    winston = require('../lib/logger.js').winston;

/***********************************/
/* Global setup                    */
/***********************************/
var PORT,
    client;


(function() {
  //set the port for server
  PORT = config.PORT_TEST;
  //create client to test api
  client = restify.createJsonClient({
      url: 'http://localhost:' + PORT,
  });
  //sstart server
  server.listen(PORT, function () {
    winston.info('listening ' + server.url);
  });
  //load mongoose models
  server.loadModels();
}());


/***********************************/
/* Tests                           */
/***********************************/

// Test for non existent path and not allowed calls 

describe('Global behaviour ', function () {
  // The done arg is very important ! If absent tests run synchronously
  // that means there is n chance you receive a response to your request
  // before mocha quits 
  it('should be a 404 page', function (done) {
    client.get('/badroute', function (err, req, res, obj) {
      res.statusCode.should.equal(404);
      done();
    });
  });

  it('should not be allowed to dump full db', function (done) {
    client.get('/tldrs', function (err, req, res, obj) {
      res.statusCode.should.equal(403);
      done();
    });
  });
});

// Test simple GET

describe('Get Requests', function () {

  //open mongo connection
  before(function (done) {
    server.openMongooseConnection(done);
  });

  it('basic query with existing id', function (done) {
    client.get('/tldrs/1', function (err, req, res, obj) {
      obj.should.have.property('summary');
      obj.summary.should.equal('No I Need for Space');
      done();
    });
  });
  it('basic query with non-existing id', function (done) {
    client.get('/tldrs/100', function (err, req, res, obj) {
      obj.should.not.have.property('summary');
      done();
    });
  });

  //close connection
  after(function (done) {
    server.closeMongooseConnection(done);
  });
});


