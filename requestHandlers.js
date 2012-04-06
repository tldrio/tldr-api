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

// POST a new tldr
function postNewTldr (req, res, next) {
  var tldrData = req.body,
      tldr = TldrModel.createTldr({url: tldrData.url
                              , summary: tldrData.summary});

  TldrModel.find({_id: tldr._id}, function (err, docs) {
    if (err) { return handleInternalDBError(err, next, "Internal error in postNewTldr"); }

    if (docs.length > 0) {
      return next(new customErrors.tldrAlreadyExistsError('tldr already exists, can\'t create it again'));
    } else {
      tldr.save(function (err) {
        console.log(err);
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
function postUpdateTldr (req, res, next) {
  var tldrUpdates = req.body
    , id = req.params.id;

  // Direct injection of req.body is not secure
  // Need to limit modification to allowed fields
  TldrModel.findAndModify({_id:id},
                          [],
                          {$set: tldrUpdates},
                          {new: true},
                          callback);

  function callback (err, doc) {
    if (err) {
      if (err.errors) {
        return next(new restify.InvalidContentError(models.getAllValidationErrorsInNiceJSON(err.errors)));   // Validation error, return causes of failure to user
      } else {
        return handleInternalDBError(err, next, "Internal error postUpdateTldr");    // Unexpected error while saving
      }
    }
    
    return res.json(200, doc);
  }
}

// Module interface
module.exports.getAllTldrs = getAllTldrs;
module.exports.getTldrById = getTldrById;
module.exports.postNewTldr = postNewTldr;
module.exports.postUpdateTldr = postUpdateTldr;
