/**
 * Use RedisQueue as messaging system
 *
 */

var RedisQueue = require('./redis-queue')
  , config = require('./config')
  ;

function createMQClient() {
  var options = config.redisQueue;

  options.scope = config.env;
  return new RedisQueue(options);
}

module.exports = createMQClient;
