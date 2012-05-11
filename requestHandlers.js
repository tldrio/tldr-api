/**
 * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
*/


var mongoose = require('mongoose') // Mongoose ODM to Mongo
  , restify = require('restify')
  , crypto = require('crypto')
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
      .sort('updatedAt', -1)
      .limit(limit)
      .run(function(err, docs) {
        if (err) { return handleInternalDBError(err, res, "Internal error in getTldrByHostname"); }

        return res.json(200, docs);
      });
    }

  }

}

// GET a tldr by id
function getTldrById (req, res, next) {
  var id = req.params.id;
  TldrModel.find({_id: id}, function (err, docs) {
    if (err) { return handleInternalDBError(err, res, "Internal error in getTldrById"); }

    if (docs.length === 0) {
      return next(new restify.ResourceNotFoundError('This record doesn\'t exist'));
    } else {
      return res.json(200, docs[0]);    // Success
    }
  });
}

//GET all tldrs corresponding to a hostname
function getAllTldrsByHostname (req, res, next) {
  TldrModel.find({hostname: req.params.hostname}, function (err, docs) {
    if (err) { return handleInternalDBError(err, res, "Internal error in getTldrByHostname"); }

    return res.json(200, docs);
  });
}



/* Update existing tldr
 * Only update fields user has the rights to update to avoid unexpected behaviour
 * We don't need to udpate url, _id or hostname because if record was found _id is the same
 * and url didn't change
 * If tldr did not exist, we create it
 */
function updateTldrCreateIfNeeded (req, res, next) {
  var tldr
    , id;

  // Return Error if url is missing
  if (!req.body.url) {
    return res.json(403, {"url": "No URL was provided"});   // TODO: use global validation mechanism instead
  }

  //Retrieve _id to perform lookup in db
  id = TldrModel.computeIdFromUrl(req.body.url);

  TldrModel.find({_id: id}, function (err, docs) {
    if (err) { return handleInternalDBError(err, res, "Internal error in updateTldrCreateIfNeeded"); }

    if (docs.length === 1) {
      tldr = docs[0];
      tldr.update(req.body);   // A tldr was found, update it
    } else {
      tldr = TldrModel.createInstance(req.body);   // No tldr was found, create it
    }

    tldr.save(function (err) {
      if (err) {
        if (err.errors) {
          return res.json(403, models.getAllValidationErrorsWithExplanations(err.errors));   // 403 is for validations error (request not authorized, see HTTP spec)
        } else {
          return handleInternalDBError(err, res, "Internal error in postCreateTldr");    // Unexpected error while saving
        }
      }

      return res.json(200, tldr);   // Success
    });

  });

}


// Module interface
module.exports.getTldrsWithQuery = getTldrsWithQuery;
module.exports.getTldrById = getTldrById;
module.exports.updateTldrCreateIfNeeded = updateTldrCreateIfNeeded;
module.exports.getAllTldrsByHostname = getAllTldrsByHostname;
