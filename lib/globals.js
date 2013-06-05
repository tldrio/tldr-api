/**
 * Global static object to be shared with any module
 * Contains all global methods
 */

var redis = require('redis')
  , redisClient = redis.createClient()
  , config = require('./config')
  , analytics = require('../models/analytics')
  ;


/**
 * Get from redis a global count defined by its key
 * Callback signature: err, count
 */
function getGlobalCount (key, callback) {
  var keyInRedis = 'global:' + key;

  redisClient.select(config.redisDb, function () {
    redisClient.exists(keyInRedis, function (err, exists) {
      if (err) { return callback(err); }
      if (!exists) {
        return callback(null, 0);
      } else {
        redisClient.get(keyInRedis, function (err, count) {
          if (err) { return callback(err); }
          return callback(null, parseInt(count, 10));
        });
      }
    });
  });
}
module.exports.getGlobalCount = getGlobalCount;


/**
 * Increment by inc a global count defined by its key
 * Callback is optional, signature: err, newCount
 */
function incrementGlobalCount (key, inc, cb) {
  var keyInRedis = 'global:' + key
    , callback = cb || function () {};

  redisClient.select(config.redisDb, function () {
    redisClient.incrby(keyInRedis, inc, callback);
  });
}
module.exports.incrementGlobalCount = incrementGlobalCount;


// Short hands for the total tldr read count
module.exports.getTotalTldrReadCount = function (callback) {
  getGlobalCount('totalTldrReadCount', callback);
};

module.exports.incrementTotalTldrReadCount = function (cb) {
  incrementGlobalCount('totalTldrReadCount', 1, cb);
};


// Short hands for the total words saved count
module.exports.getTotalWordsSaved = function (callback) {
  getGlobalCount('totalWordsSaved', callback);
};

module.exports.incrementTotalWordsSaved = function (n, cb) {
  incrementGlobalCount('totalWordsSaved', n, cb);
};


/**
 * Get from redis a global value
 * Callback signature: err, value
 */
function getGlobalValue (key, cb) {
  var keyInRedis = "global:" + key
    , callback = cb || function () {}
    ;

  redisClient.select(config.redisDb, function () {
    redisClient.exists(keyInRedis, function (err, exists) {
      if (err) { return callback(err); }
      if (!exists) { return callback(null, undefined); }

      redisClient.get(keyInRedis, function (err, value) {
        if (err) { return callback(err); }
        return callback(null, value);
      });
    });
  });
}
module.exports.getGlobalValue = getGlobalValue;


/**
 * Set a global value in redis
 * Optional ttl in seconds
 * Callback signature: err
 */
function setGlobalValue (key, value, ttl, cb) {
  var keyInRedis = "global:" + key
    , callback;

  if (typeof ttl === 'function') {
    cb = ttl;
    ttl = null;
  }

  callback = cb || function () {};

  redisClient.select(config.redisDb, function () {
    redisClient.set(keyInRedis, value, function (err) {
      if (err) { return callback(err); }

      if (!ttl) { return callback(null); }

      redisClient.expire(keyInRedis, ttl, function (err) {
        return callback(err);
      });
    });
  });
}
module.exports.setGlobalValue = setGlobalValue;

