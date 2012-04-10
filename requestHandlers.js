/**
 * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
*/


var mongoose = require('mongoose') // Mongoose ODM to Mongo
  , restify = require('restify')
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

//GET all tldrs corresponding to a hostname
var getAllTldrsByHostname = function (req, res, next) {
  TldrModel.find({hostname: req.params.hostname}, function (err, docs) {
    if (err) { return handleInternalDBError(err, next, "Internal error in getTldrByHostname"); }

    return res.json(200, docs);
  });
}


// POST a new tldr
function postNewTldr (req, res, next) {
  var tldr;

  TldrModel.find({url: req.body.url}, function (err, docs) {
    if (err) { return handleInternalDBError(err, next, "Internal error in postNewTldr"); }

    if (docs.length > 0) {
      return next(new customErrors.tldrAlreadyExistsError('tldr already exists, can\'t create it again'));
    } else {
      // Create the new tldr based on only the user modifiable parameters
      //tldr = new TldrModel(models.acceptableUserInput.call(TldrModel, req.body));
      //tldr.craftInstance();

      tldr = TldrModel.createAndCraftInstance(models.acceptableUserInput.call(TldrModel, req.body));


      tldr.save(function (err) {
        if (err) {
          if (err.errors) {
            return next(new restify.InvalidContentError(models.getAllValidationErrorsInNiceJSON(err.errors)));   // Validation error, return causes of failure to user
          } else {
            return handleInternalDBError(err, next, "Internal error in postNewTldr");    // Unexpected error while saving
          }
        }

        return res.json(200, tldr);   // Success
      });
    }
  });
}


// POST an updated tldr
// Locate tldr by Id (probably not a feature we want to enable, updating by url is better)
function postUpdateTldr (req, res, next) {
  var tldr, prop;

  TldrModel.find({_id: req.params.id}, function (err, docs) {
    if (err) { return handleInternalDBError(err, next, "Internal error in postUpdateTldr"); }

    if (docs.length === 0) {
      return next(new restify.InvalidContentError('Couldn\'t find tldr with this id to update'));
    } else {
      tldr = docs[0];

      // Only update fields user has the rights to update to avoid unexpected behaviour
      for (prop in req.body) {
        if (models.TldrModel.userModifiableFields[prop]) {
          tldr[prop] = req.body[prop];
        }
      }

      // Ensure consistency across fields, including _id (which changes if url changes)
      tldr.craftInstance();

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
module.exports.getTldrByHostname = getTldrByHostname;
module.exports.postNewTldr = postNewTldr;
module.exports.postUpdateTldr = postUpdateTldr;
