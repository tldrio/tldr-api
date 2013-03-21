var models = require('../lib/models')
  , Tldr = models.Tldr
  , i18n = require('../lib/i18n')
  ;

/**
 * Get the tldrs corresponding to one or more category names.
 * Query string options:
 * skip, limit (as usual)
 * sort: '-createdAt' (latest), '-readCount' (most read)
 * categories: 'cat1 cat2 cat3 ...'
 */
function getTldrsByCategoryName (req, res, next) {
  var options = {}
    , defaultLimit = 50;
    ;

  if (!req.query.categories) { return res.send(403, i18n.missingCategoriesNames); }

  options.skip = req.query.skip;
  options.sort = req.query.sort;

  // TODO: customUtils function for this
  options.limit = parseInt(req.query.limit || defaultLimit, 10);
  options.limit = isNaN(options.limit) ? 1 : options.limit;
  options.limit = Math.min(defaultLimit, Math.max(1, options.limit));

  Tldr.findByCategoryName(req.query.categories, options, function (err, tldrs) {
    if (err) { return res.send(500, err); }

    return res.json(200, tldrs);
  });
}



// Interface
module.exports.getTldrsByCategoryName = getTldrsByCategoryName;
