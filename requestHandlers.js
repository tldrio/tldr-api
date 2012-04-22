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
function handleInternalDBError(err, next, msg) {
  bunyan.error({error: err, message: msg});
  return next(new restify.InternalError('An internal error has occured, we are looking into it'));
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
        if (err) { return handleInternalDBError(err, next, "Internal error in getTldrByHostname"); }

        return res.json(200, docs);
      });
    }

  }

}

// GET a tldr by id
function getTldrById (req, res, next) {
  var id = req.params.id;
  TldrModel.find({_id: id}, function (err, docs) {
    if (err) { return handleInternalDBError(err, next, "Internal error in getTldrById"); }

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
    if (err) { return handleInternalDBError(err, next, "Internal error in getTldrByHostname"); }

    return res.json(200, docs);
  });
}



// POST create a new tldr
//
// Provide url, summary etc... in request
// create new tldr associated to this url

function postCreateTldr (req, res, next) {
  var id
  , tldr;

  // Return Error if url is missing
  if (!req.body.url) {
    return next( new restify.MissingParameterError('No URL was provided in the request'));
  }

  //Create New Tldr
  tldr = TldrModel.createInstance(req.body);

  tldr.save(function (err) {
    if (err) {
      if (err.errors) {
        return next(new restify.InvalidContentError(models.getAllValidationErrorsWithExplanations(err.errors)));   // Validation error, return causes of failure to user
      } else if (err.code === 11000){
        //11000 is a Mongo error code for duplicate _id key
        return next(new customErrors.TldrAlreadyExistsError('A tldr for the provided url already exists. You can update with PUT /tldrs/:id'));
      } else {
        return handleInternalDBError(err, next, "Internal error in postCreateTldr");    // Unexpected error while saving
      }
    }
    return res.json(200, tldr);   // Success
  });
}


//Update existing tldr
// Only update fields user has the rights to update to avoid unexpected behaviour
//We don't need to udpate url, _id or hostname because if record was found _id is the same
//and url didn't change
//
function putUpdateTldr (req, res, next) {
  var tldr
    , id;

  // Return Error if url is missing
  if (!req.body.url) {
    return next( new restify.MissingParameterError('No URL was provided in the request'));
  }

  //Retrieve _id to perform lookup in db
  id = TldrModel.computeIdFromUrl(req.body.url);

  TldrModel.find({_id:id}, function (err, docs) {
    if (err) { return handleInternalDBError(err, next, "Internal error in putUpdateTldr"); }
    
    tldr = docs[0];
    tldr.update(req.body);

    tldr.save(function(err) {

      if (err) {
        if (err.errors) {
          return next(new restify.InvalidContentError(models.getAllValidationErrorsWithExplanations(err.errors)));   // Validation error, return causes of failure to user
        } else {
          return handleInternalDBError(err, next, "Internal error in putUpdateTldr");    // Unexpected error while saving
        }
      } else {
        return res.json(200, tldr);
      }

    });

  });

}


// Module interface
module.exports.getTldrsWithQuery = getTldrsWithQuery;
module.exports.getTldrById = getTldrById;
module.exports.postCreateTldr = postCreateTldr;
module.exports.putUpdateTldr = putUpdateTldr;
module.exports.getAllTldrsByHostname = getAllTldrsByHostname;
