var TwitterAnalytics = require('../../models/analytics').TwitterAnalytics
  , _ = require('underscore')
  , customUtils = require('../../lib/customUtils')
  ;

module.exports = function (req, res, next) {
  var values = req.renderingValues || {}
    , partials = req.renderingPartials || {}
    , daysBack = req.params.daysBack
    , today = customUtils.getDayResolution(new Date())
    , beg = new Date(today.getTime() - daysBack * 24 * 3600 * 1000)
    , small = 0, big = 0
    , smallCount = 0, bigCount = 0
    , cutoffRead = 4
    , cutoffReadBU = 4
    ;

  values.small = 0;
  values.big = 0;
  values.smallCount = 0;
  values.bigCount = 0;

  values.smallBU = 0;
  values.bigBU = 0;
  values.smallCountBU = 0;
  values.bigCountBU = 0;

  partials.content = '{{>website/pages/twitterAnalytics}}';

  TwitterAnalytics.find({ timestamp: { $gte: beg, $lte: today } }, function (err, tas) {
    tas = tas.sort(function (a, b) { return b.requestedCount - a.requestedCount; });

    tas.forEach(function (ta) {
      ta.requestedByLength = ta.requestedBy.length;
      if (ta.requestedCount < cutoffRead) {
        values.small += ta.requestedCount;
        values.smallCount += 1;
      } else {
        values.big += ta.requestedCount;
        values.bigCount += 1;
      }

      if (ta.requestedCount < cutoffReadBU) {
        values.smallBU += ta.requestedBy.length;
        values.smallCountBU += 1;
      } else {
        values.bigBU += ta.requestedBy.length;
        values.bigCountBU += 1;
      }
    });

    values.tas = tas;
    values.daysBack = daysBack;

    res.render('website/basicLayout', { values: values
                                      , partials: partials
                                      });
  });
};
