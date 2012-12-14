var redis = require('redis')
  , client1 = redis.createClient(6379)
  , client2 = redis.createClient(6379)
  , client3 = redis.createClient(6379)
  , client4 = redis.createClient(6379)
  , _ = require('underscore')
  ;



  client1.subscribe('bite');

  client1.on('message', function (channel, message) {
    console.log("=== RECEIVED #1 === " + channel + " - " + JSON.parse(message).bloup);
    //console.log("---", _.keys(message));
  });

  //client3.subscribe('bite');

  //client3.on('message', function (channel, message) {
    //console.log("=== RECEIVED #3 === " + channel + " - " + message);
  //});


  setInterval(function () {
    client2.publish('bite', JSON.stringify({ bloup: 'Ca fartouille ?' }));
  }, 500);

  //setInterval(function () {
    //client4.publish('bite', 'Ca gratte ?');
  //}, 800);


