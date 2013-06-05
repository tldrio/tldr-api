var models = require('../lib/models')
  , User = models.User
  , mailer = require('../lib/mailer')
  ;

module.exports = function (req, res, next) {
  var values;

  if (! req.user) { return res.send(401); }

  values = { reason: req.body.reason, username: req.user.username, email: req.user.email };
  mailer.sendEmail({ type: 'adminUserDeleted'
                   , development: false
                   , values: values
                   });

  req.user.deleteAccount(function (err) {
    if (err) {
      return res.send(403);
    } else {
      req.logOut();
      return res.send(200);
    }
  });
};


