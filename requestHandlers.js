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



// GET all tldrs
function getAllTldrs (req, res, next) {
    return next(new restify.NotAuthorizedError('Dumping the full tldrs db is not allowed'));
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
            return handleInternalDBError(err, next, "Internal error in postCreateTldr");    // Unexpected error while saving
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
module.exports.getTldrByUrl = getTldrByUrl;
module.exports.putTldrByUrl = putTldrByUrl;
