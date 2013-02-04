/**
 * RedisQueue tests
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */


var should = require('chai').should()
  , assert = require('chai').assert
  , _ = require('underscore')
  , i18n = require('../lib/i18n')
  , rqConfig = { port: 6379, scope: 'bloup' }
  , RedisQueue = require('../lib/redis-queue')
  ;


describe.only('Redis Queue', function () {

  it('Should send and receive standard messages correctly', function (done) {
    var rq = new RedisQueue(rqConfig);

    rq.on('un test', function (data) {
      data.first.should.equal('First message');
      data.second.should.equal('Second message');
      done();
    }
    , function () {
        rq.emit('un test', { first: 'First message'
                            , second: 'Second message' });
      });
  });

  it('Should receive pattern messages correctly', function (done) {
    var rq = new RedisQueue(rqConfig);

    rq.on('test:*', function (data) {
      data.first.should.equal('First message');
      data.second.should.equal('Second message');
      done();
    }
    , function () {
        rq.emit('test:created', { first: 'First message'
                            , second: 'Second message' });
      });
  });


});


