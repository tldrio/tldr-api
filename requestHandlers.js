/**
 * Server for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
*/


var mongoose = require('mongoose') // Mongoose ODM to Mongo
  , db = mongoose.connect('mongodb://localhost/datastore-test')
  , winston = require('./lib/logger.js').winston // Custom logger built with Winston
  , models = require('./models')
  , TldrModel = models.TldrModel;



// GET all tldrs
var getAllTldrs = function (req, res, next) {
  res.send(403, "Dont dump the db fucking idiot");
};

// GET a tldr by id
var getTldrById = function (req, res, next) {
  var id = req.params.id;
  TldrModel.find({_id: id}, function (err, docs) {
    if (docs.length === 0) {
      res.send(404, "This record doesn't exist");
    }
    else {
      res.send(docs[0]);
    }
  });
};


function postNewTldr (req, res, next) {
  var tldrData = req.body,
      tldr = models.createTldr(tldrData.url,
                               tldrData.summary);
  tldr.save(function (err) {
    if (err) {throw err;}
  });
  res.send(200, tldr);
}

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
    res.send(200, doc);
  }

}

// Module interface
exports.getAllTldrs = getAllTldrs;
exports.getTldrById = getTldrById;
exports.postNewTldr = postNewTldr;
exports.postUpdateTldr = postUpdateTldr;
