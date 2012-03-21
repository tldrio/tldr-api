/***********************************/
/* Require dependencies            */
/***********************************/

var should = require('chai').should(),
    assert = require('chai').assert,
    restify = require('restify'),
    server = require('../server-restify.js'),
    config = require('../lib/config.js'),
    winston = require('../lib/logger.js').winston;

/***********************************/
/* Global setup                    */
/***********************************/
var PORT = config.PORT_TEST,
    client = restify.createJsonClient({
        url: 'http://localhost:' + PORT,
    });

server.listen(PORT, function () {
  winston.info('listening ' + server.url);
});

/***********************************/
/* Temporary test example          */
/***********************************/
describe('This test', function () {
  it('should be an very useful test', function () {
    var a = 4,
        b = 5,
        c = a + b;
    assert.equal(c, 9);
  });
  it('should be even more useful ', function () {
    var name = 'NFA',
        post = {date:'1/1/1111', 
                author:'NFA',
                subject:'summary'};
    post.date.should.be.a('string');
    post.should.have.property('subject');
    name.should.equal(post.author);
  });
});


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
  it('basic query with id', function (done) {
    client.get('/tldrs/1', function (err, req, res, obj) {
      obj.should.have.property('summary');
      done();
    });
  });
});


