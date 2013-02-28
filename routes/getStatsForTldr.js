/**
 * Get all stats concerning a tldr. Query string parameters:
 * * resolution: daily or monthly
 * * beg: beginning of period for which we want stats (null for no bound)
 * * end: end of period for which we want stats (null for no bound)
 */

var i18n = require('../lib/i18n')
  , analytics = require('../models/analytics')
  , TldrAnalytics = analytics.TldrAnalytics
  , Tldr = require('../models/tldrModel')
  ;

module.exports = function (req, res, next) {
  var tldrId = req.params.id
    , resolution = req.query.resolution
    , beg = req.query.beg
    , end = req.query.end
    ;

  if (!tldrId) { return res.send(404, i18n.resourceNotFound); }
  if (! resolution || (resolution !== 'daily' && resolution !== 'monthly')) {
    resolution = 'daily';   // Default
  }

  TldrAnalytics[resolution].getData(beg, end, tldrId, function (err, data) {
    if (err) { return res.send(500); }
    if (!data) { return res.json(200, []); }

    return res.json(200, data);
  });
};
