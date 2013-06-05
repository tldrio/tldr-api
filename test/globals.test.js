var should = require('chai').should()
  , assert = require('chai').assert
  , _ = require('underscore')
  , i18n = require('../lib/i18n')
  , redis = require('redis')
  , redisClient = redis.createClient()
  , globals = require('../lib/globals')
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
    globals.getGlobalCount('thetest', function (err, count) {
      count.should.equal(0);
      globals.incrementGlobalCount('thetest', 1, function () {
        globals.getGlobalCount('thetest', function (err, count) {
          count.should.equal(1);
          done();
        });
      });
    });
  });

  it('Should be able to get a global count and increase it if it is set', function (done) {
    globals.getGlobalCount('thetest', function (err, count) {
      count.should.equal(0);
      globals.incrementGlobalCount('thetest', 1, function () {
        globals.getGlobalCount('thetest', function (err, count) {
          count.should.equal(1);
          globals.incrementGlobalCount('thetest', 1, function () {
            globals.incrementGlobalCount('thetest', 1, function () {
              globals.incrementGlobalCount('thetest', 1, function () {
                globals.getGlobalCount('thetest', function (err, count) {
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
    globals.getGlobalCount('thetest', function (err, count) {
      count.should.equal(0);
      globals.getGlobalCount('another', function (err, count) {
        count.should.equal(0);
        globals.incrementGlobalCount('thetest', 1, function () {
          globals.getGlobalCount('thetest', function (err, count) {
            count.should.equal(1);
            globals.getGlobalCount('another', function (err, count) {
              count.should.equal(0);
              globals.incrementGlobalCount('another', 4, function () {
                globals.getGlobalCount('thetest', function (err, count) {
                  count.should.equal(1);
                  globals.getGlobalCount('another', function (err, count) {
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

});   // ==== End of 'Total read count' ==== //


describe('Get and set a global value', function () {
  beforeEach(function (done) {
    redisClient.select(config.redisDb, function () {
      redisClient.del("global:thetest", function () {
        redisClient.del("global:another", done);
      });
    });
  });

  it('Get an unknown value yields undefined', function (done) {
    globals.getGlobalValue('thetest', function (err, v) {
      assert.isNull(err);
      assert.isUndefined(v);
      done();
    });
  });

  it('Can get and set a value freely', function (done) {
    globals.setGlobalValue('thetest', 'something', function (err) {
      globals.getGlobalValue('thetest', function (err, v) {
        v.should.equal('something');
        done();
      });
    });
  });

  it('Can set a TTL on keys', function (done) {
    globals.setGlobalValue('thetest', 'something', 1, function (err) {
      globals.getGlobalValue('thetest', function (err, v) {
        // Can get the value
        v.should.equal('something');
        setTimeout(function () {
          globals.getGlobalValue('thetest', function (err, v) {
            // Value is gone now
            assert.isUndefined(v);
            done();
          });
        }, 2000);
      });
    });
  });

});

