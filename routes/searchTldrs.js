/**
 * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var bunyan = require('../lib/logger').bunyan
  , Tldr = require('../lib/models').Tldr
  , mailer = require('../lib/mailer')
  , normalizeUrl = require('../lib/customUtils').normalizeUrl
  , i18n = require('../lib/i18n');

/**
 * Returns a search of tldrs (through route /tldrs/search)
 * You can specify which tldrs you want with the following parameters in the URL
 * Currently the olderthan parameter has priority over the startat parameter
 * @param {Integer} quantity quantity of tldrs to be fetched. Can't be greater than 10 (Optional - default: 10)
 * @param {Integer} startat Where to start looking for tldrs. 0 to start at the latest, 5 to start after the fifth latest and so on (Optional - default: 0)
 * @param {Integer} olderthan Returned tldrs must be older than this date, which is expressed as the number of milliseconds since Epoch - it's given by the Date.getTime() method in Javascript (Optional - default: now)
 * @param {String} url If set, this handler will return the tldr (if any) whose url is the url parameter
 *
 * If both startat and olderthan are set, we use olderthan only.
 */
function searchTldrs (req, res, next) {
  var query = req.query
    , url = query.url
    , defaultLimit = 10
    , limit = query.quantity || defaultLimit
    , startat = query.startat || 0
    , olderthan = query.olderthan;

  bunyan.incrementMetric('tldrs.search.routeCalled');

  // If we have a url specified we don't need to go further just grab the
  // corresponding tldr
  if (url) {
    bunyan.incrementMetric('tldrs.search.byUrl');

    url = normalizeUrl(url);
    Tldr.findAndIncrementReadCount({ url: url }, req.user, function (err, doc) {
      if (err) {
        return next({ statusCode: 500, body: { message: i18n.mongoInternErrGetTldrUrl} } );
      }

      if (!doc) {

        // Advertise admins there is a summary emergency
        if (req.user && !req.user.isAdmin()) {
          mailer.sendEmail({ type: 'adminSummaryEmergency'
                           , development: false
                           , values: { url: url, user: req.user }
                           });
        }

        return next({ statusCode: 404, body: { message: i18n.resourceNotFound} } );
      }

      // Success
      bunyan.incrementMetric('tldrs.get.json');
      return res.json(200, tldr);
    });

    return;
  }


  bunyan.incrementMetric('tldrs.search.latest');

  // Check that limit is an integer and clip it between 1 and defaultLimit
  if (isNaN(limit)) { limit = defaultLimit; }
  limit = Math.max(0, Math.min(defaultLimit, limit));
  if (limit === 0) { limit = defaultLimit; }

  if (olderthan) {
    // olderthan should be an Integer. If not we use the default value (now as the number of milliseconds since Epoch)
    if (isNaN(olderthan)) { olderthan = (new Date()).getTime(); }

    Tldr.find({})
     .sort('-updatedAt')
     .limit(limit)
     .populate('creator', 'username twitterHandle')
     .lt('updatedAt', olderthan)
     .exec(function(err, docs) {
       if (err) {
         return next({ statusCode: 500, body: {message: i18n.mongoInternErrQuery} });
       }

       res.json(200, docs);
     });


  } else {
    // startat should be an integer and at least 0
    if (isNaN(startat)) { startat = 0; }
    startat = Math.max(0, startat);

    Tldr.find({})
     .sort('-updatedAt')
     .limit(limit)
     .skip(startat)
     .populate('creator', 'username twitterHandle')
     .exec(function(err, docs) {
       if (err) {
         return next({ statusCode: 500, body: {message: i18n.mongoInternErrQuery} });
       }
       // Example of how the function is used
       bunyan.incrementMetric('latestCalled', req);
       res.json(200, docs);
     });
  }
}

module.exports = searchTldrs;
