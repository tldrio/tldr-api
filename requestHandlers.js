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
  , customErrors = require('./lib/errors')
  , check = require('validator').check;


// If an error occurs when retrieving from/putting to the db, inform the user gracefully
// Later, we may implement a retry count
function handleInternalDBError(err, next, msg) {
  bunyan.error({error: err, message: msg});
  return next(new restify.InternalError('An internal error has occured, we are looking into it'));
}



// GET all tldrs
function getAllTldrs (req, res, next) {
    return next(new restify.NotAuthorizedError('Dumping the full tldrs db is not allowed'));
}

// GET tldrs with query
// For now, the only acceptable method is "latest"
function getTldrsWithQuery (req, res, next) {
  var query = req.query
    , defaultLimit = 10
    , method = 'latest'
    , limit = query.limit || defaultLimit
    , startat = query.startat || 0;

  if (_.isEmpty(query)) {
    return next(new restify.NotAuthorizedError('Dumping the full tldrs db is not allowed'));
  }

  // Check that limit is an integer and clip it between 1 and defaultLimit
  try { check(limit).isInt(); } catch (e) { limit = defaultLimit; }
  limit = Math.max(0, Math.min(defaultLimit, limit));
  if (limit === 0) { limit = defaultLimit; }

  // startat should be an integer and at least 0
  try { check(startat).isInt(); } catch (e) { startat = 0; }
  startat = Math.max(0, startat);

  if (method === 'latest') {
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
  var url = decodeURIComponent(req.params.url)
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
  var url = decodeURIComponent(req.params.url)
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
      TldrModel.createAndSaveInstance(url, req.body, function (err) {
        if (err) {
          if (err.errors) {
            res.json(403, models.getAllValidationErrorsWithExplanations(err.errors));
            return next();
          } else {
            return handleInternalDBError(err, next, "Internal error in postCreateTldr");    // Unexpected error while saving
          }
        }

        res.send(201); // should set location header to indicate URI of new resource
        return next();
      });
    }
  });

}


// Module interface
module.exports.getAllTldrs = getAllTldrs;
module.exports.getTldrsWithQuery = getTldrsWithQuery;
module.exports.getTldrByUrl = getTldrByUrl;
module.exports.putTldrByUrl = putTldrByUrl;
