/**
 * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
*/


var mongoose = require('mongoose') // Mongoose ODM to Mongo
  , restify = require('restify')
  , crypto = require('crypto')
  , bunyan = require('./lib/logger').bunyan
  , models = require('./models')
  , TldrModel = models.TldrModel
  , customErrors = require('./lib/errors');


// If an error occurs when retrieving from/putting ti the db, inform the user gracefully
// Later, we may implement a retry count
function handleInternalDBError(err, next, msg) {
  bunyan.error({error: err, message: msg});
  return next(new restify.InternalError('An internal error has occured, we are looking into it'));
}


// GET all tldrs
var getAllTldrs = function (req, res, next) {
  return next(new restify.NotAuthorizedError('Dumping the full tldrs db is not allowed'));
};

// GET a tldr by id
var getTldrById = function (req, res, next) {
  var id = req.params.id;
  TldrModel.find({_id: id}, function (err, docs) {
    if (err) { return handleInternalDBError(err, next, "Internal error in getTldrById"); }

    if (docs.length === 0) {
      return next(new restify.ResourceNotFoundError('This record doesn\'t exist'));
    } else {
      return res.json(200, docs[0]);    // Success
    }
  });
};


// POST create or update tldr
//
// Provide url, summary etc... in request
// If tldr associated to url exists update the updatablefields
// else create new tldr associated to this url

function postCreateOrUpdateTldr (req, res, next) {
  var tldr
    , tldrData = {}
    , sha1 = crypto.createHash('sha1')
    , id;

  // Handle missing params in request
  if (!req.body.url) {
    return next( new restify.MissingParameterError('No url is provided in request'));
  }
  if (!req.body.summary) {
    return next( new restify.MissingParameterError('No summary is provided in request'));
  }
  
  //Compute _id to perform lookup in db
  sha1.update(req.body.url, 'utf8');
  id = sha1.digest('hex');

  TldrModel.find({_id:id}, function (err, docs) {
    if (err) { return handleInternalDBError(err, next, "Internal error in postCreateOrUpdateTldr"); }
    if (docs.length === 0) {
      //Create New Tldr
      tldr = TldrModel.createAndCraftInstance(models.acceptableUserInput.call(TldrModel, req.body));
      tldr.save(function (err) {
        if (err) {
          if (err.errors) {
            return next(new restify.InvalidContentError(models.getAllValidationErrorsInNiceJSON(err.errors)));   // Validation error, return causes of failure to user
          } else {
            return handleInternalDBError(err, next, "Internal error in postCreateOrUpdateTldr");    // Unexpected error while saving
          }
        }
        return res.json(200, tldr);   // Success
      });
    } else {
      //Update existing tldr
      var prop;

      tldr = docs[0];
      //We don't need to udpate url, _id or hostname because if record was found _id is the same
      //and url didn't change

      // Only update fields user has the rights to update to avoid unexpected behaviour
      for (prop in req.body) {
        if (models.TldrModel.userUpdatableFields[prop]) {
          tldr[prop] = req.body[prop];
        }
      }

      tldr.save(function(err) {
        if (err) {
          return next(new restify.InvalidContentError(models.getAllValidationErrorsInNiceJSON(err.errors)));   // Validation error, return causes of failure to user
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
