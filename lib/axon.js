/**
 * Module for wrapping Bunyan
 *
 */

var axon = require('axon')
  , bunyan = require('./logger').bunyan
  , socket = {};


socket.publisher = axon.socket('pub-emitter');
socket.subscriber = axon.socket('sub-emitter');

socket.publisher.connect(4967);
socket.subscriber.bind(4967);

bunyan.info('Axon Socket set up');

//Export logger objects
module.exports = socket;
