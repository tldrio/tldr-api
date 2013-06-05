var Tldr = require('../models/tldrModel')
  , i18n = require('../lib/i18n');

module.exports = function (req, res, next) {
  Tldr.blockTldr(req.params.id, function (err) {
    if (err) {
      return res.send(500, i18n.blockFailure);
    } else {
      return res.send(200, i18n.blockSuccess);
    }
  });
};
