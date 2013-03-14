var _ = require('underscore')
  , Tldr = require('../../lib/models').Tldr
  , bunyan = require('../../lib/logger').bunyan
  , config = require('../../lib/config')
  , customUtils = require('../../lib/customUtils')
  ;

module.exports = function (req, res, next) {
  var values = {};


  Tldr.findOneById(req.params.id, function (err, tldr) {
    if (err || !tldr) { return res.json(404, {}); }

    values.tldr = tldr;

    return res.render('website/tldrEmbedTest', { values: values });
  });
};
