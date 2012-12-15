/**
 * RedisQueue tests
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */


var should = require('chai').should()
  , assert = require('chai').assert
  , _ = require('underscore')
  , i18n = require('../lib/i18n')
  , config = require('../lib/config')
  , RedisQueue = require('../lib/redis-queue')
  //, rqClient1 = new RedisQueue(config.redisQueue)
  ;


describe.only('Redis Queue', function () {

  it('Should send standard messages correctly', function (done) {
    var rq1 = new RedisQueue(config.redisQueue)
      , rq2 = new RedisQueue(config.redisQueue)
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


});


