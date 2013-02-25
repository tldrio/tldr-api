/**
 * Get all stats concerning a tldr or a user. Query string parameters:
 * * resolution: daily or monthly
 * * beg: beginning of period for which we want stats (null for no bound)
 * * end: end of period for which we want stats (null for no bound)
 */

var i18n = require('../lib/i18n')
  , analytics = require('../models/analytics')
  , TldrAnalytics = analytics.TldrAnalytics
  , UserAnalytics = analytics.UserAnalytics
  ;

function getStats (Model, req, res, next) {
  var resolution = req.query.resolution
    , beg = req.query.beg
    , end = req.query.end
    , Model
    ;

  if (!req.params.id) { return res.send(404, i18n.resourceNotFound); }
  if (! resolution || (resolution !== 'daily' && resolution !== 'monthly')) {
    resolution = 'daily';   // Default
  }

  Model[resolution].getData(beg, end, req.params.id, function (err, data) {
    if (err) { return res.send(500); }
    if (!data) { return res.json(200, []); }

    return res.json(200, data);
  });
};


// Interface
module.exports.getStatsForTldr = function (req, res, next) {
  return getStats(TldrAnalytics, req, res, next);
};

module.exports.getStatsForUser = function (req, res, next) {
  return getStats(UserAnalytics, req, res, next);
};
