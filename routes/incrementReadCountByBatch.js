var models = require('../lib/models')
  , Tldr = models.Tldr
  ;

module.exports = function (req, res, next) {
  var ids = req.body.ids || [];

  Tldr.incrementReadCountByBatch(ids, function (err) {
    if (err) {
      return res.send(500, err);
    } else {
      return res.send(200);
    }
  });
};
