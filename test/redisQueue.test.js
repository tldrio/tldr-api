/**
 * RedisQueue tests
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */


var should = require('chai').should()
  , assert = require('chai').assert
  , _ = require('underscore')
  , i18n = require('../lib/i18n')
  , rqConfig = { port: 6379, db: 2, scope: 'bloup' }
  , RedisQueue = require('../lib/redis-queue')
  ;


describe('Redis Queue', function () {

  it('Should send and receive standard messages correctly', function (done) {
    var rq1 = new RedisQueue(rqConfig)
      , rq2 = new RedisQueue(rqConfig)
      ;

    rq1.on('un test', function (data) {
      data.first.should.equal('First message');
      data.second.should.equal('Second message');
      done();
    }
    , function () {
        rq2.emit('un test', { first: 'First message'
                            , second: 'Second message' });
      });
  });

  it('Should receive pattern messages correctly', function (done) {
    var rq1 = new RedisQueue(rqConfig)
      , rq2 = new RedisQueue(rqConfig)
      ;

    rq1.on('test:*', function (data) {
      data.first.should.equal('First message');
      data.second.should.equal('Second message');
      done();
    }
    , function () {
        rq2.emit('test:created', { first: 'First message'
                            , second: 'Second message' });
      });
  });


});


