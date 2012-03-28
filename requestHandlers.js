/**
 * Server for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
*/


var mongoose = require('mongoose') // Mongoose ODM to Mongo
  , db = mongoose.connect('mongodb://localhost/datastore-test')
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


// Module interface
exports.getAllTldrs = getAllTldrs;
exports.getTldrById = getTldrById;
