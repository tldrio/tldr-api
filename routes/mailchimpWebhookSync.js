var bunyan = require('../lib/logger').bunyan
  , models = require('../lib/models')
  , User = models.User;

function mailchimpWebhookSync (req, res, next) {

  if (req.query.mailchimpkey === '19104853058') {
    if (req.body.type === 'unsubscribe') {
      User.findOne( { email: req.body.email } , function (err, user) {
        if (err) {
          return res.send(500);
        }
        user.notificationsSettings.newsletter = false;
        user.notificationsSettings.serviceUpdates = false;
        user.save();
        return res.send(200);
      });
    } else {
      return res.send(200);
    }
  } else {
    return res.send(404);
  }
}


module.exports = mailchimpWebhookSync;
