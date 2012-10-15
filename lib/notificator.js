var config = require('./config')
  , bunyan = require('./logger').bunyan
  , i18n = require('./i18n');



/**
 * Send a notification
 * @param {String} name type. the type of notification to send
 *
 */
function publish (options) {
  var type = options.type
    , to = options.to
    , from = options.from
    , on = options.on;


  console.log('new notif received: ', type, from, on, to);

}


module.exports.publish = publish;
