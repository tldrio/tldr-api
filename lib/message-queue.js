/**
 * Use Node Redis Pubsub as messaging system
 *
 */

var NRP = require('node-redis-pubsub')
  , config = require('./config')
  , options = config.nodeRedisPubsub
  ;

options.scope = config.env;
module.exports = new NRP(options);   // Use the same client application-wide
