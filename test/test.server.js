var should = require('chai').should(),
    assert = require('chai').assert,
    restify = require('restify'),
    server = require('../server-restify.js'),
    config = require('../lib/config.js'),
    PORT = config.PORT_TEST;


server.listen(PORT, function() {
  console.log('listening ' + server.url);
});
server.get('/test', function(req, res, next) {
  res.send('test');
  console.log('handle hello request');
});

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
  it('should return hello', function() {
    var client = restify.createJsonClient({
      url: 'http://localhost:' + config.PORT_DEV,
    });
    console.log('client' + client.url);
    client.get('/test', function(err, req, res, obj) {
        obj.should.equal('hello');
        console.log('in client');
        //console.log(JSON.stringify(obj, null, 2));
    });
  });
});



