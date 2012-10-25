var bunyan = require('../lib/logger').bunyan;


function mailchimpWebhookSync (req, res, next) {

  bunyan.info(req.body);
  bunyan.info(req.params);
  next();
}


module.exports = mailchimpWebhookSync;
