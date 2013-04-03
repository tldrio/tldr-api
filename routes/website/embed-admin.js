var models = require('../../lib/models')
  , EmbedAnalytics = models.EmbedAnalytics
  , _ = require('underscore')
  , customUtils = require('../../lib/customUtils')
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
    data = _.map(data, function (h, key) {
      var pagesData = _.groupBy(h, 'pageUrl');
      pagesData = _.map(pagesData, function (p, key) {
        return { url: key
               , readCount: _.reduce(_.pluck(p, 'readCount'), function(memo, n) { return memo + n; }, 0)
               };
      });
      pagesData = _.values(pagesData);
      pagesData = pagesData.sort(function (a, b) { return b.readCount - a.readCount; });

      return { hostname: key
             , readCount: _.reduce(_.pluck(h, 'readCount'), function(memo, n) { return memo + n; }, 0)
             , firstRead: customUtils.dateForDisplay(_.min(_.pluck(h, 'firstRead')))
             , lastRead: customUtils.dateForDisplay(_.max(_.pluck(h, 'lastRead')))
             //, tldrsIds: _.uniq(_.pluck(h, 'tldrId'), false, function (id) { return id.toString(); })
             , pagesData: pagesData
             };
    });
    data = _.values(data);
    data = data.sort(function (a, b) { return b.readCount - a.readCount; });



    values.data = data;
    res.render('website/basicLayout', { values: values
                                      , partials: partials
                                      });
  });
};
