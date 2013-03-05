var Tldr = require('../lib/models').Tldr
  , i18n = require('../lib/i18n');


module.exports = function (req, res, next) {
  var id = req.params.id;

  Tldr.findOne({ _id: id }, function (err, tldr) {
    if (err || !tldr) { return res.send(404, i18n.resourceNotFound); }

    tldr.deleteIfPossible(req.user, function (err, message) {
      if (err) {
        return res.send(401, err);
      } else {
        if (message === i18n.tldrWasDeleted) {
          return res.send(204);
        } else {
          return res.send(200);
        }
      }
    });
  });
}

