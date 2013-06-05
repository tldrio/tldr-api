var should = require('chai').should()
  , assert = require('chai').assert
  , _ = require('underscore')
  , models = require('../lib/models')
  , Tldr = models.Tldr
  , User = models.User
  , Credentials = models.Credentials
  , i18n = require('../lib/i18n')
  , whitelist = require('../lib/whitelist')
  , config = require('../lib/config')
  , DbObject = require('../lib/db')
  , db = new DbObject(config.dbHost, config.dbName, config.dbPort)
  , async = require('async')
  , redis = require('redis')
  , redisClient = redis.createClient()
  ;


describe('Whitelist', function () {
  var user;

  before(function (done) {
    db.connectToDatabase(done);
  });

  after(function (done) {
    db.closeDatabaseConnection(done);
  });

  beforeEach(function (done) {
    redisClient.select(config.redisDb, function () {
      redisClient.keys('global:whitelist:*', function (err, keys) {
        async.each(keys
        , function (key, cb) {
          redisClient.del(key, function (err) { return cb(); });
        }, done);
      });
    });
  });


  it('Can whitelist an url and its normalized form', function (done) {
    whitelist.isWhitelisted('http://domain.com/article?var=val', function (err, iswl) {
      iswl.should.equal(false);
      whitelist.isWhitelisted('http://domain.com/article', function (err, iswl) {
        iswl.should.equal(false);

        whitelist.whitelist('http://domain.com/article?var=val', function (err) {
          assert.isNull(err);

          whitelist.isWhitelisted('http://domain.com/article?var=val', function (err, iswl) {
            iswl.should.equal(true);
            whitelist.isWhitelisted('http://domain.com/article', function (err, iswl) {
              iswl.should.equal(true);
              done();
            });
          });
        });
      });
    });
  });

  it('Can whitelist multiple urls and its normalized form', function (done) {
    whitelist.isWhitelisted('http://domain.com/article?var=val', function (err, iswl) {
      iswl.should.equal(false);
      whitelist.isWhitelisted('http://domain.com/article', function (err, iswl) {
        iswl.should.equal(false);
        whitelist.isWhitelisted('http://domain.com/other?var=val', function (err, iswl) {
          iswl.should.equal(false);
          whitelist.isWhitelisted('http://domain.com/other', function (err, iswl) {
            iswl.should.equal(false);

            whitelist.whitelist(['http://domain.com/article?var=val', 'http://domain.com/other?var=val'], function (err) {
              assert.isNull(err);

              whitelist.isWhitelisted('http://domain.com/article?var=val', function (err, iswl) {
                iswl.should.equal(true);
                whitelist.isWhitelisted('http://domain.com/article', function (err, iswl) {
                  iswl.should.equal(true);
                  whitelist.isWhitelisted('http://domain.com/other?var=val', function (err, iswl) {
                    iswl.should.equal(true);
                    whitelist.isWhitelisted('http://domain.com/other', function (err, iswl) {
                      iswl.should.equal(true);
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

  it('TTL is set in the whitelisting', function (done) {
    whitelist.isWhitelisted('http://domain.com/article?var=val', function (err, iswl) {
      iswl.should.equal(false);

      whitelist.whitelist('http://domain.com/article?var=val', function (err) {
        assert.isNull(err);

        whitelist.isWhitelisted('http://domain.com/article?var=val', function (err, iswl) {
          iswl.should.equal(true);

          redisClient.ttl('global:whitelist:original:http://domain.com/article?var=val', function (err, ttl) {
            assert.isTrue(2 * 24 * 3600 - ttl < 2);   // Small tolerance
            done();
          });
        });
      });
    });
  });


});   // ==== End of '#Whitelist' ==== //

