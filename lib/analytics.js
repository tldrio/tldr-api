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

function getAnalyticsForUser (user, daysAgo, callback) {
    var values = {}
    , now = new Date(), timeAgo = new Date()
    , userToDisplayAnalyticsFor = user
    , selectionName;

  if (!daysAgo) {
    selectionName = 'allTime';
    timeAgo = null;
  } else {
    selectionName = 'past' + daysAgo + 'Days';
    timeAgo.setDate(timeAgo.getDate() - daysAgo);
  }

  values[selectionName] = { selection: selectionName };

  UserAnalytics.daily.getAnalytics(null, null, userToDisplayAnalyticsFor._id, function (err, data) {
    var tldrsCreatedLastXDays = daysAgo ? joinArrayField(data, 'tldrsCreated', timeAgo) : userToDisplayAnalyticsFor.tldrsCreated ;

    values.analytics = JSON.stringify(data);

    // Past X days
    values[selectionName].tldrsCreated = tldrsCreatedLastXDays.length;
    values[selectionName].createdSomeTldrs = values[selectionName].tldrsCreated > 0;
    values[selectionName].tldrsCreatedPlural = values[selectionName].tldrsCreated !== 1;
    values[selectionName].readCount = sumField(data, 'readCount', timeAgo);
    values[selectionName].readCountPlural = values[selectionName].readCount !== 1;
    values[selectionName].wasRead = values[selectionName].readCount > 0;
    values[selectionName].articleWordCount = sumField(data, 'articleWordCount', timeAgo);
    values[selectionName].thanks = sumField(data, 'thanks', timeAgo);
    values[selectionName].thanksPlural = values[selectionName].thanks !== 1;
    values[selectionName].timeSaved = computeTimeSaved(values[selectionName].articleWordCount);
    values[selectionName].coffeeBreaks = Math.floor(values[selectionName].timeSaved * 6);
    values[selectionName].coffeeBreaksPlural = values[selectionName].coffeeBreaks !== 1;

    //Tldr.find({ _id: { $in: userToDisplayAnalyticsFor.tldrsCreated } }, 'articleWordCount wordCount', function (err, tldrs) {
      Tldr.find({ _id: { $in: tldrsCreatedLastXDays } }, 'articleWordCount wordCount', function (err, tldrsLastXDays) {
        var userJoinDate = moment(userToDisplayAnalyticsFor.createdAt)
          , now = moment()
          , joinedRecently = now.diff(userJoinDate, 'days') < 6
          ;

        values[selectionName].wordsCompressed = sumField(tldrsLastXDays, 'articleWordCount');
        values[selectionName].wordsWritten = sumField(tldrsLastXDays, 'wordCount');

        // properly format numbers before passing to templates
        values[selectionName].tldrsCreated = _s.numberFormat(values[selectionName].tldrsCreated);
        values[selectionName].readCount = _s.numberFormat(values[selectionName].readCount);
        values[selectionName].articleWordCount = _s.numberFormat(values[selectionName].articleWordCount);
        values[selectionName].thanks = _s.numberFormat(values[selectionName].thanks);
        values[selectionName].wordsCompressed = _s.numberFormat(values[selectionName].wordsCompressed);
        values[selectionName].wordsWritten = _s.numberFormat(values[selectionName].wordsWritten);
        values[selectionName].timeSaved = moment.duration(values[selectionName].timeSaved, 'hours').humanize();
        values[selectionName].coffeeBreaks = _s.numberFormat(values[selectionName].coffeeBreaks);

        callback(values);
      });
    //});
  });
}

module.exports.getAnalyticsForUser = getAnalyticsForUser;
