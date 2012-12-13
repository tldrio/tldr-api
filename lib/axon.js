/**
 * Module for wrapping Axon
 *
 */

var axon = require('axon')
  , bunyan = require('./logger').bunyan
  , config = require('./config')
  , socket = {};


socket.publisher = axon.socket('pub-emitter');
socket.subscriber = axon.socket('sub-emitter');

socket.publisher.connect(config.axonPort);
socket.subscriber.bind(config.axonPort);

bunyan.info('Axon Socket set up');


socket.subscriber.on('bite', function (data) {
  console.log("Received data ", data);
});



setInterval(function(){
  socket.publisher.emit('bite', { where: 'dans ton cul' });
}, 500);

//Export logger objects
module.exports = socket;
