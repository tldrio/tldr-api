var Tldr = require('../lib/models').Tldr
  , i18n = require('../lib/i18n');

function getLatestTldrs (req, res, next) {
  var defaultLimit = 50
    , limit = req.params.quantity || defaultLimit
    , startat = req.query.startat || 0
    , dataToReturn = []
    ;

  // Check that limit is an integer and clip it between 1 and defaultLimit
  if (isNaN(limit)) { limit = defaultLimit; }
  limit = Math.max(0, Math.min(defaultLimit, limit));
  if (limit === 0) { limit = defaultLimit; }

  // startat should be an integer and at least 0
  if (isNaN(startat)) { startat = 0; }
  startat = Math.max(0, startat);

  Tldr.find({ 'distributionChannels.latestTldrs': true })
   .sort('-updatedAt')
   .limit(limit)
   .skip(startat)
   .populateTldrFields()
   .exec(function(err, docs) {
     if (err) { return next({ statusCode: 500, body: {message: i18n.mongoInternErrQuery} }); }

      docs.forEach(function (tldr) {
        dataToReturn.push(tldr.getPublicData());
      });

     res.json(200, dataToReturn);
   });
}

// Module interface
module.exports = getLatestTldrs;
