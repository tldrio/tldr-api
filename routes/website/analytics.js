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

  function computeTimeSaved (wordCount) {
    // 5 words per second, returns in hours
    // very simple for now
    return wordCount / (5 * 3600);
  }

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

    values.allTime.tldrsCreated = req.user.tldrsCreated.length;
    values.allTime.readCount = sumField(data, 'readCount');
    values.allTime.articleWordCount = sumField(data, 'articleWordCount');
    values.allTime.thanks = sumField(data, 'thanks');
    values.allTime.timeSaved = computeTimeSaved(values.allTime.articleWordCount);

    values.past30Days.tldrsCreated = tldrsCreatedLast30Days.length;
    values.past30Days.readCount = sumField(data, 'readCount', aMonthAgo);
    values.past30Days.articleWordCount = sumField(data, 'articleWordCount', aMonthAgo);
    values.past30Days.thanks = sumField(data, 'thanks', aMonthAgo);
    values.past30Days.timeSaved = computeTimeSaved(values.past30Days.articleWordCount);

    Tldr.find({ _id: { $in: req.user.tldrsCreated } }, 'articleWordCount wordCount', function (err, tldrs) {
      Tldr.find({ _id: { $in: tldrsCreatedLast30Days } }, 'articleWordCount wordCount', function (err, tldrsLast30Days) {
        var userJoinDate = moment(req.user.createdAt)
          , now = moment()
          , joinedRecently = now.diff(userJoinDate, 'days') < 6
          ;

        values.allTime.wordsCompressed = sumField(tldrs, 'articleWordCount');
        values.allTime.wordsWritten = sumField(tldrs, 'wordCount');

        values.past30Days.wordsCompressed = sumField(tldrsLast30Days, 'articleWordCount');
        values.past30Days.wordsWritten = sumField(tldrsLast30Days, 'wordCount');

        // figure out correct subtitle depending on activity
        if (values.past30Days.readCount > 0) {
          values.active = true;
          values.subtitle = 'Looks like the world owes you a one!';
        } else if (values.past30Days.readCount === 0 && values.allTime.readCount > 0) {
          values.wasActive = true;
          values.subtitle = 'You were so prolific once upon a time, what happened to you?';
        } else {
          if (joinedRecently) {
            values.subtitle = 'Time to stop procrastinating and contribute a tl;dr!';
            values.neverActive = true;
          } else {
            values.subtitle = 'Looks like you\'re new here. You should try creating your first tl;dr!';
            values.isNewHere = true;
          }
        }

        // properly format numbers before passing to templates
        values.past30Days.tldrsCreated = _s.numberFormat(values.past30Days.tldrsCreated);
        values.past30Days.readCount = _s.numberFormat(values.past30Days.readCount);
        values.past30Days.articleWordCount = _s.numberFormat(values.past30Days.articleWordCount);
        values.past30Days.thanks = _s.numberFormat(values.past30Days.thanks);
        values.past30Days.wordsCompressed = _s.numberFormat(values.past30Days.wordsCompressed);
        values.past30Days.wordsWritten = _s.numberFormat(values.past30Days.wordsWritten);
        values.past30Days.timeSaved = _s.numberFormat(values.past30Days.timeSaved);
        values.allTime.tldrsCreated = _s.numberFormat(values.allTime.tldrsCreated);
        values.allTime.readCount = _s.numberFormat(values.allTime.readCount);
        values.allTime.articleWordCount = _s.numberFormat(values.allTime.articleWordCount);
        values.allTime.thanks = _s.numberFormat(values.allTime.thanks);
        values.allTime.wordsCompressed = _s.numberFormat(values.allTime.wordsCompressed);
        values.allTime.wordsWritten = _s.numberFormat(values.allTime.wordsWritten);
        values.allTime.timeSaved = _s.numberFormat(values.allTime.timeSaved);

        res.render('website/basicLayout', { values: values
                                          , partials: partials
                                          });
      });
    });
  });
}

