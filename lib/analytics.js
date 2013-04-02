/**
 * /account page of the website
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/

var config = require('./config')
  , models = require('./models')
  , User = models.User
  , UserAnalytics = models.UserAnalytics
  , TldrAnalytics = models.TldrAnalytics
  , Tldr = models.Tldr
  , _ = require('underscore')
  , _s = require('underscore.string')
  , moment = require('moment')
  ;


function computeTimeSaved (wordCount) {
  // 200 words per minute, returns in hours
  // very simple for now
  return wordCount / (3.3 * 3600);
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

/**
 * Compute the analytics for a given user and a given timelapse
 * @param {User} User User for which to compute the analytics
 * @param {Number} daysAgo TimeLapse in days from which to compute the analytics. Computes analytics for all time if null
 * @param {Function} callback callback once the computation is done. Signature err, analytics, rawAnalyticsData
 */
function getAnalyticsForUser (user, daysAgo, callback) {
  var values = {}
    , now = new Date(), timeAgo = new Date()
    ;

  if (!daysAgo) {
    timeAgo = null;
  } else {
    timeAgo.setDate(timeAgo.getDate() - daysAgo);
  }

  UserAnalytics.daily.getAnalytics(null, null, user._id, function (err, data) {
    if (err) {
      callback(err);
    }
    var tldrsCreatedLastXDays = daysAgo ? joinArrayField(data, 'tldrsCreated', timeAgo) : user.tldrsCreated ;

    // Past X days
    values.tldrsCreated = tldrsCreatedLastXDays.length;
    values.createdSomeTldrs = values.tldrsCreated > 0;
    values.tldrsCreatedPlural = values.tldrsCreated !== 1;
    values.readCount = sumField(data, 'readCount', timeAgo);
    values.readCountPlural = values.readCount !== 1;
    values.wasRead = values.readCount > 0;
    values.articleWordCount = sumField(data, 'articleWordCount', timeAgo);
    values.thanks = sumField(data, 'thanks', timeAgo);
    values.thanksPlural = values.thanks !== 1;
    values.timeSaved = computeTimeSaved(values.articleWordCount);
    values.coffeeBreaks = Math.floor(values.timeSaved * 6);
    values.coffeeBreaksPlural = values.coffeeBreaks !== 1;

    Tldr.find({ _id: { $in: tldrsCreatedLastXDays } }, 'articleWordCount wordCount', function (err, tldrsLastXDays) {
      if (err) {
        callback(err);
      }

      values.wordsCompressed = sumField(tldrsLastXDays, 'articleWordCount');
      values.wordsWritten = sumField(tldrsLastXDays, 'wordCount');

      // properly format numbers before passing to templates
      values.tldrsCreated = _s.numberFormat(values.tldrsCreated);
      values.readCount = _s.numberFormat(values.readCount);
      values.articleWordCount = _s.numberFormat(values.articleWordCount);
      values.thanks = _s.numberFormat(values.thanks);
      values.wordsCompressed = _s.numberFormat(values.wordsCompressed);
      values.wordsWritten = _s.numberFormat(values.wordsWritten);
      values.timeSaved = moment.duration(values.timeSaved, 'hours').humanize();
      values.coffeeBreaks = _s.numberFormat(values.coffeeBreaks);

      callback(null, values, JSON.stringify(data));
    });
  });
}

module.exports.getAnalyticsForUser = getAnalyticsForUser;
