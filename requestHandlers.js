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
function handleInternalDBError(err, res, msg) {
  bunyan.error({error: err, message: msg});
  return res.json( 500, {"message": "An internal error has occured, we are looking into it"} );
}



// GET all tldrs
function getTldrsWithQuery (req, res, next) {

  if (_.isEmpty(req.query) ) {
    return next(new restify.NotAuthorizedError('Dumping the full tldrs db is not allowed'));
  }
  else {

    //TODO Better Handling of default args 
    // Handle specific query for future needs
    var method = req.query.sort || 'latest'
      , limit = req.query.limit || 20;

    limit = Math.max(0, Math.min(20, limit));   // Clip limit between 0 and 20

    if (limit === 0) {
      return res.json(200, []);   // A limit of 0 is equivalent to no limit, this avoids dumping the whole db
    }

    if (method === 'latest') {
      TldrModel.find({})
      .sort('updatedAt', -1) //pretty sure this is not good, should use a double index
      .limit(limit)
      .run(function(err, docs) {
        if (err) { return handleInternalDBError(err, res, "Internal error in getTldrByHostname"); }

        return res.json(200, docs);
      });
    }

  }

}

// GET a tldr by url
function getTldrByUrl (req, res, next) {
  var url = decodeURIComponent(req.params.url)
    , log = req.log;

  //log.warn(url);
  TldrModel.find({_id: url}, function (err, docs) {
    if (err) { return handleInternalDBError(err, res, "Internal error in getTldrByUrl"); }

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

  TldrModel.find({_id: url}, function (err, docs) {
    var tldr;

    if (err) { return handleInternalDBError(err, res, "Internal error in updateTldrCreateIfNeeded"); }

    if (docs.length === 1) {
      tldr = docs[0];
      tldr.update(req.body);   // A tldr was found, update it
    } else {
      tldr = TldrModel.createInstance(req.body);   // No tldr was found, create it
      tldr._id = url;
    }

    tldr.save(function (err) {
      if (err) {
        if (err.errors) {
          res.json(403, models.getAllValidationErrorsWithExplanations(err.errors));   // 403 is for validations error (request not authorized, see HTTP spec)
          return next();
        } else {
          return handleInternalDBError(err, res, "Internal error in postCreateTldr");    // Unexpected error while saving
        }
      }

      res.send(204);   // No Content status code for succesful PUT requests
      return next();
    });

  });

}


// Module interface
module.exports.getTldrsWithQuery = getTldrsWithQuery;
module.exports.getTldrByUrl = getTldrByUrl;
module.exports.putTldrByUrl = putTldrByUrl;
