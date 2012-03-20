var should = require('chai').should(),
    assert = require('chai').assert;

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
