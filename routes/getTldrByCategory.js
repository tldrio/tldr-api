var models = require('../lib/models')
  , Tldr = models.Tldr
  ;

/**
 * Get the tldrs corresponding to one or more category names.
 * Query string options:
 * skip, limit (as usual)
 * sort: '-createdAt' (latest), '-readCount' (most read)
 */
function getTldrsByCategoryName
