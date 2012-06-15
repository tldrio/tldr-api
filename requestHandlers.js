/**
 * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
*/


var mongoose = require('mongoose') // Mongoose ODM to Mongo
  , bunyan = require('./lib/logger').bunyan
  , _ = require('underscore')
  , models = require('./models')
  , TldrModel = models.TldrModel;



/**
 * Convenience route for latest tldrs
 *
 */
function getLatestTldrs (req, res, next) {
  var quantity = req.params.quantity
    , newReq = req;
  newReq.query.quantity = quantity;
  searchTldrs(newReq, res, next);
}


/**
 * Returns a search of tldrs (through route /tldrs/search/)
 * You can specify which tldrs you want with the following parameters in the URL
 * Currently the olderthan parameter has priority over the startat parameter
 * @param {Integer} quantity quantity of tldrs to be fetched. Can't be greater than 10 (Optional - default: 10)
 * @param {Integer} startat Where to start looking for tldrs. 0 to start at the latest, 5 to start after the fifth latest and so on (Optional - default: 0)
 * @param {Integer} olderthan Returned tldrs must be older than this date, which is expressed as the number of milliseconds since Epoch - it's given by the Date.getTime() method in Javascript (Optional - default: now)
 *
 * If both startat and olderthan are set, we use olderthan only.
 */
function searchTldrs (req, res, next) {
  var query = req.query
    , defaultLimit = 10
    , limit = query.quantity || defaultLimit
    , startat = query.startat || 0
    , olderthan = query.olderthan;

  // Check that limit is an integer and clip it between 1 and defaultLimit
  if (isNaN(limit)) { limit = defaultLimit; }
  limit = Math.max(0, Math.min(defaultLimit, limit));
  if (limit === 0) { limit = defaultLimit; }

  if (olderthan) {
    // olderthan should be an Integer. If not we use the default value (now as the number of milliseconds since Epoch)
    if (isNaN(olderthan)) { olderthan = (new Date()).getTime(); }

    TldrModel.find({})
     .sort('updatedAt', -1)
     .limit(limit)
     .$lt('updatedAt', olderthan)
     .run(function(err, docs) {
       if (err) {return next({statusCode: 500, body: {messsage: 'Internal Error executing query'}}); }
       res.json(200, docs);
     });


  } else {
    // startat should be an integer and at least 0
    if (isNaN(startat)) { startat = 0; }
    startat = Math.max(0, startat);

    TldrModel.find({})
     .sort('updatedAt', -1)
     .limit(limit)
     .skip(startat)
     .run(function(err, docs) {
       if (err) {return next({statusCode: 500, body: {messsage: 'Internal Error executing query'}}); }
       res.json(200, docs);
     });
  }
}


// GET a tldr by url
function getTldrByUrl (req, res, next) {
  // parameters are already decoded by restify before being passed on to the request handlers
  var url = TldrModel.normalizeUrl(req.params.url);

  TldrModel.find({_id: url}, function (err, docs) {
    if (err) {return next({statusCode: 500, body: {messsage: 'Internal Error getting a Tldr by urlwhile saving'}}); }
            
    if (docs.length === 0) {
      next({statusCode: 404, body: {message: 'ResourceNotFound'}} );
    } else {
      res.json(200, docs[0]);    // Success
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
  // Restify already decodes te paramters
  var url = req.params.url
    , log = req.log;

  if(!req.body){
    return next({statusCode: 400, body: {message: 'Body required in request'}} );
  }

  TldrModel.find({_id: url}, function (err, docs) {
    var tldr;
    if (err) {return next({statusCode: 500, body: {messsage: 'Internal Error updating a Tldr'}});}
            

    if (docs.length === 1) {
      tldr = docs[0];
      tldr.updateValidFields(req.body, function (err) {
        if (err) {
          if (err.errors) {
            return next({statusCode: 403, body: models.getAllValidationErrorsWithExplanations(err.errors)} );
          } else {
            return next({statusCode: 500, body: {messsage: 'Internal Error updating a Tldr while saving'}});
          }
        }
        else {
          res.send(204);
        }
      });
    } else {

      TldrModel.createAndSaveInstance(url, req.body, function (err, tldr) {
        if (err) {
          if (err.errors) {
            return next({statusCode: 403, body: models.getAllValidationErrorsWithExplanations(err.errors)} );
          } else {
            return next({statusCode: 500, body: {messsage: 'Internal Error creating a new Tldr'}});
          }
        }
        else {
          res.json(201, tldr);
        }
      });
    }
  });

}

/**
 * Handle All errors coming from next( err) calls
 *
 */

function handleErrors (err, req, res, next) {
  res.json(err.statusCode, err.body);
}

// Module interface
module.exports.getLatestTldrs = getLatestTldrs;
module.exports.searchTldrs = searchTldrs;
module.exports.getTldrByUrl = getTldrByUrl;
module.exports.putTldrByUrl = putTldrByUrl;
module.exports.handleErrors = handleErrors;
