/**
 * Use RedisQueue as messaging system
 *
 */

var RedisQueue = require('./redis-queue')
  , config = require('./config')
  , options = config.redisQueue
  ;

console.log("=== Creating a message queue");
options.scope = config.env;
module.exports = new RedisQueue(options);   // Use the same client application-wide
