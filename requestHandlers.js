/**
 * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
*/


var mongoose = require('mongoose') // Mongoose ODM to Mongo
  , bunyan = require('./lib/logger').bunyan
  , _ = require('underscore')
  , models = require('./models')
  , TldrModel = models.TldrModel
  , errors = require('./lib/errors');


// If an error occurs when retrieving from/putting to the db, inform the user gracefully
// Later, we may implement a retry count
function handleInternalDBError(err, next, msg) {
  bunyan.error({error: err, message: msg});
  return next(new errors.InternalServerError('An internal error has occured, we are looking into it'));
}


/**
 * Convenience route for latest tldrs
 *
 */
function getLatestTldrs (req, res, next) {
  var quantity = req.params.quantity
    , newReq = req;
  newReq.query.quantity = quantity;
  searchTldrs(newReq, res, next);
}


/**
 * Returns a search of tldrs (through route /tldrs/search)
 * You can specify which tldrs you want with the following parameters in the URL
 * Currently the olderthan parameter has priority over the startat parameter
 * @param {Integer} quantity quantity of tldrs to be fetched. Can't be greater than 10 (Optional - default: 10)
 * @param {Integer} startat Where to start looking for tldrs. 0 to start at the latest, 5 to start after the fifth latest and so on (Optional - default: 0)
 * @param {Integer} olderthan Returned tldrs must be older than this date, which is expressed as the number of milliseconds since Epoch - it's given by the Date.getTime() method in Javascript (Optional - default: now)
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


  // If we have a url specified we don't need to go further just grab the
  // corresponding tldr
  if(url) {
    url = TldrModel.normalizeUrl(url);
    TldrModel.find({url: url}, function (err, docs) {
      if (err) { return handleInternalDBError(err, next, "Internal error in getTldrByUrl"); }

      if (docs.length === 0) {
        next(new errors.NotFoundError('ResourceNotFound'));
      } else {
        res.json(200, docs[0]);    // Success
      }
    });
    return;
  }

  // Check that limit is an integer and clip it between 1 and defaultLimit
  if (isNaN(limit)) { limit = defaultLimit; }
  limit = Math.max(0, Math.min(defaultLimit, limit));
  if (limit === 0) { limit = defaultLimit; }

  if (olderthan) {
    // olderthan should be an Integer. If not we use the default value (now as the number of milliseconds since Epoch)
    if (isNaN(olderthan)) { olderthan = (new Date()).getTime(); }

    TldrModel.find({})
     .sort('updatedAt', -1)
     .limit(limit)
     .$lt('updatedAt', olderthan)
     .run(function(err, docs) {
       if (err) { return handleInternalDBError(err, next, "Internal error in getTldrsWithQuery"); }
       res.json(200, docs);
     });


  } else {
    // startat should be an integer and at least 0
    if (isNaN(startat)) { startat = 0; }
    startat = Math.max(0, startat);

    TldrModel.find({})
     .sort('updatedAt', -1)
     .limit(limit)
     .skip(startat)
     .run(function(err, docs) {
       if (err) { return handleInternalDBError(err, next, "Internal error in getTldrsWithQuery"); }
       res.json(200, docs);
     });
  }
}


/**
 * GET /tldrs/:id
 *
 */

function getTldrById (req, res, next) {

  var id = req.params.id;

  // We find by id here
  TldrModel.find({_id: id}, function (err, docs) {
    var tldr;
    if (err) { 
      handleInternalDBError(err, next, "Internal error in getTldrById"); 
    }
    else {

      // We found the record
      if (docs.length === 1) {
        tldr = docs[0];
        res.send(200, tldr);
      } 
      // There is no record for this id
      else {
        next (new errors.NotFoundError('There is no record for this id'));
      }
    }
  });
}

/**
 * Handles POST /tldrs
 * create new tldr, as per the spec
 * http://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9.6
 *
 */

function postNewTldr (req, res, next) {

  if(!req.body){
    return next( new errors.BadRequestError('Body required in request'));
  }


  TldrModel.createAndSaveInstance(req.body, function (err, tldr) {
    if (err) {
      if (err.errors) {
        return next(new errors.ForbiddenError('Input is not valid', models.getAllValidationErrorsWithExplanations(err.errors)));
      } else {
        return handleInternalDBError(err, next, "Internal error in postNewTldr");    // Unexpected error while saving
      }
    }
    else {
      res.json(201, tldr);
    }
  });

}

/**
 * Handles PUT /tldrs/:id
 * updates the tldr, as per the spec
 * http://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9.6
 *
 */

function putUpdateTldrWithId (req, res, next) {

  var id = req.params.id;

  if(!req.body){
    return next( new errors.BadRequestError('Body required in request'));
  }

  // We find by id here
  TldrModel.find({_id: id}, function (err, docs) {
    var tldr;
    if (err) { 
      handleInternalDBError(err, next, "Internal error in putTldrByUrl"); 
    }
    else {

      if (docs.length === 1) {
        tldr = docs[0];
        tldr.updateValidFields(req.body, function (err) {
          if (err) {
            if (err.errors) {
              return next(new errors.ForbiddenError('Input is not valid', models.getAllValidationErrorsWithExplanations(err.errors)));
            } else {
              return handleInternalDBError(err, next, "Internal error in putTldrByUrl");    // Unexpected error while saving
            }
          }
          else {
            res.send(204);
          }
        });
      } 
      else {
        next (new errors.NotFoundError('There is no record for this id'));
      }
    }
  });

}

/**
 * Handle All errors coming from next( err) calls
 *
 */

function handleErrors (err, req, res, next) {
  res.json(err.statusCode, err.body);
}

// Module interface
module.exports.getLatestTldrs = getLatestTldrs;
module.exports.getTldrById = getTldrById;
module.exports.searchTldrs = searchTldrs;
module.exports.putUpdateTldrWithId = putUpdateTldrWithId;
module.exports.postNewTldr = postNewTldr;
module.exports.handleErrors = handleErrors;
