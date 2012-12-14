var redis = require('redis')
  ;

/**
 * Create a new Redis-Queue instance that can subscribe to channels and publish messages
 * @param {Object} options Options for the client creations:
 *                 port - Optional, the port on which the Redis server is launched.
 */
function RedisQueue (options) {
  var port = options && options.port || 6379;   // 6379 is Redis' default

  this.client = redis.createClient(port);
}


/**
 * Subscribe to a channel
 * @param {String} channel The channel to subscribe to, can be a pattern e.g. 'user.*'
 * @param {Function} cb Callback to call with the received message.
 *
 */
RedisQueue.prototype.on = function(channel, cb) {
  this.client.psubscribe(channel);

  this.client.on('pmessage', function (pattern, _channel, message) {
    if (channel === pattern) {
      cb(JSON.parse(message));
    }
  });
};


/**
 * Emit an event
 * @param {String} channel Channel on which to emit the message
 * @param {Object} message
 */
RedisQueue.prototype.emit = function (channel, message) {
  this.client.publish(channel, JSON.stringify(message));
};


module.exports = RedisQueue;



// Examples
//var c1 = new RedisQueue()
  //, c2 = new RedisQueue()
  //;

//c1.on('teest:*', function (msg) {
  //console.log('=== Called with === ', msg.bloup);
//});

//c1.on('teest:updated', function (msg) {
  //console.log('=== Called with UP === ', msg.bloup);
//});

//c1.on('teest:created', function (msg) {
  //console.log('=== Called with CR === ', msg.bloup);
//});


//setInterval(function () {
  //c2.emit('teest:created', { bloup: 'Ca fartouille ?' });
//}, 500);
