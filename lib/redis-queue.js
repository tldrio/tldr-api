var redis = require('redis')
  ;

/**
 * Create a new Redis-Queue instance that can subscribe to channels and publish messages
 *
 */
function RedisQueue (options) {
  var port = options && options.port || 6379;

  this.client = redis.createClient(port);
}

RedisQueue.prototype.on = function(channel, cb) {
  this.client.subscribe(channel);

  this.client.on('message', function (ch, message) {
    if (channel === ch) {
      cb(message);
    }
  });
};

RedisQueue.prototype.emit = function (channel, message) {
  this.client.publish(channel, message);
};


module.exports = RedisQueue;

var c1 = new RedisQueue()
  , c2 = new RedisQueue()
  ;

c1.on('teest', function (msg) {
  console.log('=== Called with === ', msg);
});


  setInterval(function () {
    c2.emit('teest', 'Ca fartouille ?');
  }, 500);
