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
    ;

  partials.content = '{{>website/pages/twitterAnalytics}}';

  TwitterAnalytics.find({ timestamp: { $gte: beg, $lte: today } }, function (err, tas) {
    tas = tas.sort(function (a, b) { return b.requestedCount - a.requestedCount; });

    tas.forEach(function (ta) {
      ta.requestedByLength = ta.requestedBy.length;
      ta.representativeUrl = ta.urls[ta.urls.length - 1];
    });

    values.tas = tas;
    values.daysBack = daysBack;

    res.render('website/basicLayout', { values: values
                                      , partials: partials
                                      });
  });
};
