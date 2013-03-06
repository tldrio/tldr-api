/**
 * /account page of the website
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/

var config = require('../../lib/config')
  , models = require('../../lib/models')
  , UserAnalytics = models.UserAnalytics
  , TldrAnalytics = models.TldrAnalytics
  , Tldr = models.Tldr
  , _ = require('underscore')
  , _s = require('underscore.string')
  , moment = require('moment')
  ;

module.exports = function (req, res, next) {
  var partials = req.renderingPartials || {}
    , values = req.renderingValues || {}
    , now = new Date(), aMonthAgo = new Date()
    ;

  aMonthAgo.setDate(aMonthAgo.getDate() - 30);

  partials.content = '{{>website/pages/analytics}}';
  values.title = (values.loggedUser ? values.loggedUser.username : '') + " - How badass are you?" + config.titles.branding;

  values.past30Days = { selection: 'past30Days' };
  values.allTime = { selection: 'allTime' };

  function sumField (data, field, beg, end) {
    var selectedData = _.map(data, function (item) {
      if ((beg && beg > item.timestamp) || (end && end < item.timestamp)) {
        return 0;
      } else {
        return item[field] || 0;
      }
    });

    return _.reduce(selectedData, function (memo, n) { return memo + n; }, 0);
  }

  function joinArrayField (data, field, beg, end) {
    var selectedData = _.map(data, function (item) {
      if ((beg && beg > item.timestamp) || (end && end < item.timestamp)) {
        return [];
      } else {
        return item[field] || [];
      }
    });

    return _.reduce(selectedData, function (memo, a) { return memo.concat(a); }, []);
  }

  UserAnalytics.daily.getAnalytics(null, null, req.user._id, function (err, data) {
    var tldrsCreatedLast30Days = joinArrayField(data, 'tldrsCreated', aMonthAgo);
    values.analytics = JSON.stringify(data);

    values.allTime.tldrsCreated = _s.numberFormat(req.user.tldrsCreated.length);
    values.allTime.readCount = _s.numberFormat(sumField(data, 'readCount'));
    values.allTime.articleWordCount = _s.numberFormat(sumField(data, 'articleWordCount'));
    values.allTime.thanks = _s.numberFormat(sumField(data, 'thanks'));

    values.past30Days.tldrsCreated = _s.numberFormat(tldrsCreatedLast30Days.length);
    values.past30Days.readCount = _s.numberFormat(sumField(data, 'readCount', aMonthAgo));
    values.past30Days.articleWordCount = _s.numberFormat(sumField(data, 'articleWordCount', aMonthAgo));
    values.past30Days.thanks = _s.numberFormat(sumField(data, 'thanks', aMonthAgo));

    Tldr.find({ _id: { $in: req.user.tldrsCreated } }, 'articleWordCount wordCount', function (err, tldrs) {
      Tldr.find({ _id: { $in: tldrsCreatedLast30Days } }, 'articleWordCount wordCount', function (err, tldrsLast30Days) {
        values.allTime.wordsCompressed = _s.numberFormat(sumField(tldrs, 'articleWordCount'));
        values.allTime.wordsWritten = _s.numberFormat(sumField(tldrs, 'wordCount'));

        values.past30Days.wordsCompressed = _s.numberFormat(sumField(tldrsLast30Days, 'articleWordCount'));
        values.past30Days.wordsWritten = _s.numberFormat(sumField(tldrsLast30Days, 'wordCount'));

        res.render('website/basicLayout', { values: values
                                          , partials: partials
                                          });
      });
    });
  });
}

