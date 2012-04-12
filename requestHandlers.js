/**
 * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
*/


var mongoose = require('mongoose') // Mongoose ODM to Mongo
  , restify = require('restify')
  , _u = require('underscore')
  , crypto = require('crypto')
  , bunyan = require('./lib/logger').bunyan
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
function getAllTldrs (req, res, next) {
  return next(new restify.NotAuthorizedError('Dumping the full tldrs db is not allowed'));
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

// GET latest tldrs
function getLatestTldrs (req, res, next) {
  var numberToGet = Math.max(0, Math.min(20, req.params.number));   // Avoid getting a huge DB dump!

  if (numberToGet === 0) {
    return res.json(200, []);   // A limit of 0 is equivalent to no limit, this avoids dumping the whole db
  }

  TldrModel.find({}).sort('lastUpdated', -1).limit(numberToGet).run(function(err, docs) {
    if (err) { return handleInternalDBError(err, next, "Internal error in getTldrByHostname"); }

    return res.json(200, docs);
  });
}



// POST create or update tldr
//
// Provide url, summary etc... in request
// If tldr associated to url exists update the updatable fields
// else create new tldr associated to this url

function postCreateOrUpdateTldr (req, res, next) {
  var tldrData = {}
    , sha1 = crypto.createHash('sha1')
    , id
    , tldr;

  // Return Error if url is missing 
  if (!req.body.url) {
    return next( new restify.MissingParameterError('No URL was provided in the request'));
  }

  //Retrieve _id to perform lookup in db
  id = TldrModel.getIdFromUrl(req.body.url);

  TldrModel.find({_id:id}, function (err, docs) {
    if (err) { return handleInternalDBError(err, next, "Internal error in postCreateOrUpdateTldr"); }
    if (docs.length === 0) {
      //Create New Tldr
      tldr = TldrModel.createAndCraftInstance(req.body);
      tldr.save(function (err) {
        if (err) {
          if (err.errors) {
            return next(new restify.InvalidContentError(models.getAllValidationErrorsWithExplanations(err.errors)));   // Validation error, return causes of failure to user
          } else {
            return handleInternalDBError(err, next, "Internal error in postCreateOrUpdateTldr");    // Unexpected error while saving
          }
        }
        return res.json(200, tldr);   // Success
      });
    } else {
      //Update existing tldr
      // Only update fields user has the rights to update to avoid unexpected behaviour
      //We don't need to udpate url, _id or hostname because if record was found _id is the same
      //and url didn't change
      tldr = docs[0];
      tldr.update(req.body);
      
      tldr.save(function(err) {
        if (err) {
          if (err.errors) {
            return next(new restify.InvalidContentError(models.getAllValidationErrorsWithExplanations(err.errors)));   // Validation error, return causes of failure to user
          } else {
            return handleInternalDBError(err, next, "Internal error in postCreateOrUpdateTldr");    // Unexpected error while saving
          }
        } else {
          return res.json(200, tldr);
        }
      });
    }
  });
}


// Module interface
module.exports.getAllTldrs = getAllTldrs;
module.exports.getTldrById = getTldrById;
module.exports.postCreateOrUpdateTldr = postCreateOrUpdateTldr;
module.exports.getLatestTldrs = getLatestTldrs;
module.exports.getAllTldrsByHostname = getAllTldrsByHostname;
