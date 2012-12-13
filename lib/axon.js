/**
 * Module for wrapping Bunyan
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

//Export logger objects
module.exports = socket;
