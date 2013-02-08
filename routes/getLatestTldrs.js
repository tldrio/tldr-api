var Tldr = require('../lib/models').Tldr;

/**
 * Convenience route for latest tldrs
 *
 */
function getLatestTldrs (req, res, next) {
  var defaultLimit = 10
    , limit = req.params.quantity || defaultLimit
    , startat = req.query.startat || 0
    ;

  // Check that limit is an integer and clip it between 1 and defaultLimit
  if (isNaN(limit)) { limit = defaultLimit; }
  limit = Math.max(0, Math.min(defaultLimit, limit));
  if (limit === 0) { limit = defaultLimit; }

  // startat should be an integer and at least 0
  if (isNaN(startat)) { startat = 0; }
  startat = Math.max(0, startat);

  Tldr.find({ discoverable: true })
   .sort('-updatedAt')
   .limit(limit)
   .skip(startat)
   .populate('creator', 'username twitterHandle')
   .exec(function(err, docs) {
     if (err) { return next({ statusCode: 500, body: {message: i18n.mongoInternErrQuery} }); }

     res.json(200, docs);
   });
}

// Module interface
module.exports = getLatestTldrs;
