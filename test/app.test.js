var should = require('chai').should()
  , assert = require('chai').assert
  , _ = require('underscore')
  , i18n = require('../lib/i18n')
  , customUtils = require('../lib/customUtils')
  , normalizeUrl = customUtils.normalizeUrl
  , redis = require('redis')
  , redisClient = redis.createClient()
  , app = require('../app')
  , config = require('../lib/config')
  ;


describe.only('Total read count', function () {

  beforeEach(function (done) {
    redisClient.select(config.redisDb, function () {
      redisClient.del("global:totalTldrReadCount", done);
    });
  });

  it('Should be able to get/set the total tldr read count even if it is not yet set', function (done) {
    app.getTotalTldrReadCount(function (err, count) {
      count.should.equal(0);
      app.incrementTotalTldrReadCount(function () {
        app.getTotalTldrReadCount(function (err, count) {
          count.should.equal(1);
          done();
        });
      });
    });
  });

  it('Should be able to get the total read count and increase it if it is set', function (done) {
    app.getTotalTldrReadCount(function (err, count) {
      count.should.equal(0);
      app.incrementTotalTldrReadCount(function () {
        app.getTotalTldrReadCount(function (err, count) {
          count.should.equal(1);
          app.incrementTotalTldrReadCount(function () {
            app.incrementTotalTldrReadCount(function () {
              app.incrementTotalTldrReadCount(function () {
                app.getTotalTldrReadCount(function (err, count) {
                  count.should.equal(4);
                  done();
                });
              });
            });
          });
        });
      });
    });
  });

});
