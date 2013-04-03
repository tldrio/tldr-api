var models = require('../../lib/models')
  , EmbedAnalytics = models.EmbedAnalytics
  , _ = require('underscore')
  ;

module.exports = function (req, res, next) {
  var values = req.renderingValues || {}
    , partials = req.renderingPartials || {}
    , daysBack = req.params.daysBack
    , beg = new Date();
    ;

  partials.content = '{{>website/pages/embed-admin}}'
  values.daysBack = daysBack;

  beg.setDate(beg.getDate() - parseInt(daysBack, 10));
  EmbedAnalytics.find({ firstRead: { $gte: beg } }, function (err, data) {
    data = _.groupBy(data, 'hostname');
    data = _.map(data, function (h) {
      return { readCount: _.reduce(_.pluck(h, 'readCount'), function(memo, n) { return memo + n; }, 0)
             , firstRead: _.min(_.pluck(h, 'firstRead'))
             , lastRead: _.max(_.pluck(h, 'lastRead'))
             , tldrsIds: _.uniq(_.pluck(h, 'tldrId'), false, function (id) { return id.toString(); })
             , pagesUrls: _.uniq(_.pluck(h, 'pageUrl'))
             };
    });

    data = _.map(_.pairs(data), function (p) { return { hostname: p[0], data: p[1] }; });

    values.data = data;

    res.render('website/basicLayout', { values: values
                                      , partials: partials
                                      });
  });
};
