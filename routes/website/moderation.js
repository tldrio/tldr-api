/**
 * Moderate all new tldrs
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var models = require('../../lib/models')
  , Tldr = models.Tldr
  , SubscriptionTldr = models.SubscriptionTldr
  , async = require('async')
  , _ = require('underscore')
  , config = require('../../lib/config')
  , bufferapp = require('../../lib/bufferapp')
  ;

module.exports = function (req, res, next) {
  var values = req.renderingValues || {}
    , partials = req.renderingPartials || {}
    , socialProfiles = bufferapp.getCachedProfiles()
    ;

  values.title = "Tldrs to be moderated";
  values.socialProfiles = socialProfiles;
  partials.content = '{{>website/pages/moderation}}';

  async.waterfall(
  [
    function (cb) {
      Tldr.find({ moderated: false })
        .sort('-createdAt')
        .populateTldrFields()
        .exec(function (err, tldrs) {
          SubscriptionTldr.find({url: { $in : _.uniq(_.pluck(tldrs, 'possibleUrls'))}}, function (err, subscriptions) {
            _.each(subscriptions, function (subscription) {
              _.each(tldrs, function (tldr) {
                if (_.contains(tldr.possibleUrls, subscription.url)){
                  tldr.subscribersCount = subscription.subscribers.length;
                }
              });
            });

            values.tldrs = tldrs;
            values.count = tldrs.length;
            _.each(values.tldrs, function (tldr) {
              tldr.linkToTldrPage = true;
            });
            cb(null);
          });
        });
    }
  ], function (err) {
       res.render('website/basicLayout', { values: values
                                       , partials: partials
                                       });
  });
}


