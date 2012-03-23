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
    winston = require('../lib/logger.js').winston;

/***********************************/
/* Global setup                    */
/***********************************/

//create client to test api
client = restify.createJsonClient({
    url: 'http://localhost:' + 8686,
});
//start server
server.listen(8686, function () {
  winston.info('listening to ' + server.url);
});
//load mongoose models
server.loadModels();


/***********************************/
/* Tests                           */
/***********************************/

// Test simple GET

describe('Get Requests', function () {

  // The done arg is very important ! If absent tests run synchronously
  // that means there is n chance you receive a response to your request
  // before mocha quits 
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

  it('should not be allowed to dump full db', function (done) {
    client.get('/tldrs', function (err, req, res, obj) {
      res.statusCode.should.equal(403);
      done();
    });
  });

  it('should be a 404 page', function (done) {
    client.get('/*', function (err, req, res, obj) {
      res.statusCode.should.equal(404);
      done();
    });
  });

  //close connection
  after(function (done) {
    server.closeMongooseConnection(done);
  });
});


