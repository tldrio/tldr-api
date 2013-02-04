var redis = require('redis')
  , prefix   // Scope events to their environment
  ;


/**
 * Create a new Redis-Queue instance that can subscribe to channels and publish messages
 * @param {Object} options Options for the client creations:
 *                 port - Optional, the port on which the Redis server is launched.
 */
function RedisQueue (options) {
  var port = options && options.port || 6379;   // 6379 is Redis' default

  // Need to create two Redis clients as one cannot be both in receiver and emitter mode
  // I wonder why that is, by the way ...
  this.receiver = redis.createClient(port);
  this.emitter = redis.createClient(port);

  prefix = options.scope ? options.scope + ':' : '';
}


/**
 * Subscribe to a channel
 * @param {String} channel The channel to subscribe to, can be a pattern e.g. 'user.*'
 * @param {Function} handler Function to call with the received message.
 * @param {Function} cb Optional callback to call once the handler is registered.
 *
 */
RedisQueue.prototype.on = function(channel, handler, cb) {
  var callback = cb || function () {};

  this.receiver.on('pmessage', function (pattern, _channel, message) {
    if (prefix + channel === pattern) {
      handler(JSON.parse(message));
    }
  });

  this.receiver.psubscribe(prefix + channel, callback);
};


/**
 * Emit an event
 * @param {String} channel Channel on which to emit the message
 * @param {Object} message
 */
RedisQueue.prototype.emit = function (channel, message) {
  this.emitter.publish(prefix + channel, JSON.stringify(message));
};


module.exports = RedisQueue;
