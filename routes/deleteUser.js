var User = require('../models/userModel');

module.exports = function (req, res, next) {
  req.user.deleteAccount(function (err) {
    if (err) {
      return res.send(403);
    } else {
      return res.send(200);
    }
  });
};


