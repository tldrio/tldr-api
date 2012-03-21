var should = require('chai').should(),
    assert = require('chai').assert,
    restify = require('restify'),
    server = require('../server-restify.js'),
    config = require('../lib/config.js'),
    winston = require('../lib/logger.js').winston;

var client = restify.createJsonClient({
        url: 'http://localhost:' + PORT,
    }),
    PORT = config.PORT_TEST;

server.listen(PORT, function() {
  winston.info('listening ' + server.url);
});

// Test Example
describe('This test', function() {
  it('should be an very useful test', function() {
    var a = 4,
        b = 5,
        c = a + b;
    assert.equal(c, 9);
  });
  it('should be even more useful ', function() {
    var name = 'NFA',
        post = {date:'1/1/1111', 
                author:'NFA',
                subject:'summary'};
    post.date.should.be.a('string');
    post.should.have.property('subject');
    name.should.equal(post.author);
  });
});


describe('Set up env: ', function() {
  // The done arg is very important ! If absent tests run synchronously
  // that means there is n chance you receive a response to your request
  // before mocha quits 
  it('should return hello', function(done) {
    client.get('/hello', function(err, req, res, obj) {
        winston.info(JSON.stringify(obj, null, 2));
        done();
    });
  });
});



