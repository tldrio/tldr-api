/**
 * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
*/


var mongoose = require('mongoose') // Mongoose ODM to Mongo
  , restify = require('restify')
  , winston = require('./lib/logger.js').winston // Custom logger built with Winston
  , models = require('./models')
  , TldrModel = models.TldrModel
  , customErrors = require('./lib/errors.js');



// GET all tldrs
var getAllTldrs = function (req, res, next) {
  return next(new restify.NotAuthorizedError('Dumping the full tldrs db is not allowed'));
};

// GET a tldr by id
var getTldrById = function (req, res, next) {
  var id = req.params.id;
  TldrModel.find({_id: id}, function (err, docs) {
    if (err) {throw err;}
    if (docs.length === 0) {
      return next(new restify.ResourceNotFoundError('This record doesn\'t exist'));
    }
    else {
      res.json(200, docs[0]);
    }
  });
};

// POST a new tldr
function postNewTldr (req, res, next) {
  var tldrData = req.body,
      tldr = models.createTldr(tldrData.url,
                               tldrData.summary);

  TldrModel.find({_id: tldr._id}, function (err, docs) {
    if (err) {throw err;}
 
    if (docs.length > 0) {
      next(new customErrors.tldrAlreadyExistsError('tldr already exists, can\'t create it again'));
    } else {
      tldr.save(function (err) {
        if (err) {throw err;}
      });
      res.json(200, tldr);
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
    if (err) {throw err;}
    res.json(200, doc);
  }

}

// Module interface
module.exports.getAllTldrs = getAllTldrs;
module.exports.getTldrById = getTldrById;
module.exports.postNewTldr = postNewTldr;
module.exports.postUpdateTldr = postUpdateTldr;
