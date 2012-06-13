/**
 * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
*/


var mongoose = require('mongoose') // Mongoose ODM to Mongo
  , restify = require('restify')
  , bunyan = require('./lib/logger').bunyan
  , _ = require('underscore')
  , models = require('./models')
  , TldrModel = models.TldrModel
  , customErrors = require('./lib/errors');


// If an error occurs when retrieving from/putting to the db, inform the user gracefully
// Later, we may implement a retry count
function handleInternalDBError(err, next, msg) {
  bunyan.error({error: err, message: msg});
  return next(new restify.InternalError('An internal error has occured, we are looking into it'));
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
 * Returns a search of tldrs (through route /tldrs/search/)
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
    , defaultLimit = 10
    , limit = query.quantity || defaultLimit
    , startat = query.startat || 0
    , olderthan = query.olderthan;

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
       return next();
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
       return next();
     });
  }
}


// GET a tldr by url
function getTldrByUrl (req, res, next) {
  // parameters are already decoded by restify before being passed on to the request handlers
  var url = TldrModel.normalizeUrl(req.params.url)
    , log = req.log;

  TldrModel.find({_id: url}, function (err, docs) {
    if (err) { return handleInternalDBError(err, next, "Internal error in getTldrByUrl"); }

    if (docs.length === 0) {
      return next(new restify.ResourceNotFoundError('This record doesn\'t exist'));
    } else {
      res.json(200, docs[0]);    // Success
      return next();
    }
  });
}



/**
 * Handles PUT /tldrs/:url
 * Creates or updates the tldr, as per the spec
 * http://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9.6
 *
 */

function putTldrByUrl (req, res, next) {
  // Restify already decodes te paramters
  var url = req.params.url
    , log = req.log;

  if(!req.body){
    // Response received by client is 500. TODO : investigate why
    res.json(400, 'body required in request');
    return next();
  }

  TldrModel.find({_id: url}, function (err, docs) {
    var tldr;
    if (err) { return handleInternalDBError(err, next, "Internal error in putTldrByUrl"); }

    if (docs.length === 1) {
      tldr = docs[0];
      tldr.updateValidFields(req.body, function (err) {
        if (err) {
          if (err.errors) {
            res.json(403, models.getAllValidationErrorsWithExplanations(err.errors));
            return next();
          } else {
            return handleInternalDBError(err, next, "Internal error in putTldrByUrl");    // Unexpected error while saving
          }
        }

        res.send(204);
        return next();
      });
    } else {
      //tldr = new TldrModel(req.body);
      //tldr._id = url;
      //tldr.save(function (err) {
      TldrModel.createAndSaveInstance(url, req.body, function (err, tldr) {
        if (err) {
          if (err.errors) {
            res.json(403, models.getAllValidationErrorsWithExplanations(err.errors));
            return next();
          } else {
            return handleInternalDBError(err, next, "Internal error in postCreateTldr");    // Unexpected error while saving
          }
        }

        res.json(201, tldr);
        return next();
      });
    }
  });

}


// Module interface
module.exports.getLatestTldrs = getLatestTldrs;
module.exports.searchTldrs = searchTldrs;
module.exports.getTldrByUrl = getTldrByUrl;
module.exports.putTldrByUrl = putTldrByUrl;
