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


describe('Total read count', function () {

  beforeEach(function (done) {
    redisClient.select(config.redisDb, function () {
      redisClient.del("global:thetest", function () {
        redisClient.del("global:another", done);
      });
    });
  });

  it('Should be able to get/set a global count even if it is not yet set', function (done) {
    app.getGlobalCount('thetest', function (err, count) {
      count.should.equal(0);
      app.incrementGlobalCount('thetest', 1, function () {
        app.getGlobalCount('thetest', function (err, count) {
          count.should.equal(1);
          done();
        });
      });
    });
  });

  it('Should be able to get a global count and increase it if it is set', function (done) {
    app.getGlobalCount('thetest', function (err, count) {
      count.should.equal(0);
      app.incrementGlobalCount('thetest', 1, function () {
        app.getGlobalCount('thetest', function (err, count) {
          count.should.equal(1);
          app.incrementGlobalCount('thetest', 1, function () {
            app.incrementGlobalCount('thetest', 1, function () {
              app.incrementGlobalCount('thetest', 1, function () {
                app.getGlobalCount('thetest', function (err, count) {
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

  it('Increasing a global count should not affect the others', function (done) {
    app.getGlobalCount('thetest', function (err, count) {
      count.should.equal(0);
      app.getGlobalCount('another', function (err, count) {
        count.should.equal(0);
        app.incrementGlobalCount('thetest', 1, function () {
          app.getGlobalCount('thetest', function (err, count) {
            count.should.equal(1);
            app.getGlobalCount('another', function (err, count) {
              count.should.equal(0);
              app.incrementGlobalCount('another', 4, function () {
                app.getGlobalCount('thetest', function (err, count) {
                  count.should.equal(1);
                  app.getGlobalCount('another', function (err, count) {
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

});
