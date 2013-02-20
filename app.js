/**
 * Global static object to be shared with any module
 * Contains all global methods
 */

var redis = require('redis')
  , redisClient = redis.createClient()
  , config = require('./lib/config')
  , analytics = require('./lib/analytics')
  ;


// Get the current total read count
// callback signature: err, count
module.exports.getTotalTldrReadCount = function (callback) {
  redisClient.select(config.redisDb, function () {
    redisClient.exists("global:totalTldrReadCount", function (err, exists) {
      if (err) { return callback(err); }
      if (!exists) {
        return callback(null, 0);
      } else {
        redisClient.get("global:totalTldrReadCount", function (err, count) {
          if (err) { return callback(err); }
          return callback(null, parseInt(count, 10));
        });
      }
    });
  });
};


// Increase the total read count by one
// cb is optional, signature: err, newCount
module.exports.incrementTotalTldrReadCount = function (cb) {
  var callback = cb || function () {};
  redisClient.select(config.redisDb, function () {
    redisClient.incr("global:totalTldrReadCount", callback);
  });
};


