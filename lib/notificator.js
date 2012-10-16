var config = require('./config')
  , bunyan = require('./logger').bunyan
  , Notification = require('./models').Notification
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
    , on = options.on
    , notification;

  // create notification object
  notification = new Notification(options);


  console.log('new notif received: ', type, from, on, to);

}


module.exports.publish = publish;
