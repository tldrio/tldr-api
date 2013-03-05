var Tldr = require('../lib/models').Tldr
  , i18n = require('../lib/i18n');


module.exports = function (req, res, next) {
  var id = req.params.id;

  Tldr.findOne({ _id: id }, function (err, tldr) {
    if (err || !tldr) { return res.send(404, i18n.resourceNotFound); }

    tldr.deleteIfPossible(req.user, function (err) {
      if (err) {
        return res.send(401, err);
      } else {
        return res.send(200);
      }
    });
  });
}

