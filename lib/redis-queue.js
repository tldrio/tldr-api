var redis = require('redis')
  , client1 = redis.createClient(6379)
  , client2 = redis.createClient(6379)
  , client3 = redis.createClient(6379)
  , client4 = redis.createClient(6379)
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
  //client1.subscribe('bite');

  //client1.on('message', function (channel, message) {
    //console.log("=== RECEIVED #1 === " + channel + " - " + JSON.parse(message).bloup);
    ////console.log("---", _.keys(message));
  //});

  ////client3.subscribe('bite');

  ////client3.on('message', function (channel, message) {
    ////console.log("=== RECEIVED #3 === " + channel + " - " + message);
  ////});


  //setInterval(function () {
    //client2.publish('bite', JSON.stringify({ bloup: 'Ca fartouille ?' }));
  //}, 500);

  ////setInterval(function () {
    ////client4.publish('bite', 'Ca gratte ?');
  ////}, 800);



