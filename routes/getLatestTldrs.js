var models = require('../lib/models')
  , Tldr = models.Tldr
  , Topic = models.Topic
  , i18n = require('../lib/i18n')
  , async = require('async')
  ;

function getLatestTldrs (req, res, next) {
  var defaultLimit = 50
    , limit = req.params.quantity || defaultLimit
    , startat = req.query.startat || 0
    , dataToReturn = []
    , options = {}
    , query = { 'distributionChannels.latestTldrs': true }
    ;

  // Check that limit is an integer and clip it between 1 and defaultLimit
  if (isNaN(limit)) { limit = defaultLimit; }
  limit = Math.max(0, Math.min(defaultLimit, limit));
  if (limit === 0) { limit = defaultLimit; }

  // startat should be an integer and at least 0
  if (isNaN(startat)) { startat = 0; }
  startat = Math.max(0, startat);

  options.limit = limit;
  options.skip = startat;
  options.sort = '-updatedAt';

  async.waterfall([
  function (cb) {
    if (! req.query.category) { return cb(); }

    Topic.findOne({ slug: req.query.category.toLowerCase() }, function (err, topic) {
      if (err || !topic) { return res.send(200, []); }   // No topic found

      query.categories = topic._id;
      return cb();
    });
  }
  ],function () {
    Tldr.findByQuery(query, options, function (err, tldrs) {
      if (err) { return res.send(500, { message: i18n.mongoInternErrQuery } ); }

       tldrs.forEach(function (tldr) {
         dataToReturn.push(tldr.getPublicData());
       });

      res.json(200, dataToReturn);
    });
  });
}

// Module interface
module.exports = getLatestTldrs;
