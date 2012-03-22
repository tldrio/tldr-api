/*!
 *  Tests for Database
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */


/***********************************/
/* Require dependencies            */
/***********************************/

var should = require('chai').should(),
    assert = require('chai').assert,
    restify = require('restify'),
    models = require('../lib/data-models.js'),
    mongoose = require('mongoose'),
    winston = require('../lib/logger.js').winston;

/***********************************/
/* Init code										   */
/***********************************/

var db,
		TldrModel;

// Init function 
(function() {
  
	//Define model and define callback which will
	//be called after model definition succeeds
	models.defineModels(mongoose, function () {
			
		// Load model
		TldrModel = mongoose.model('tldrObject');
		//Establish database connection
		db = mongoose.connect('mongodb://localhost/datastore-test', function (err) {
		  if (err) {
		    throw err;
		  }
		});
	});
}());

/***********************************/
/* Tests												   */
/***********************************/

describe('Basic operations', function () {
	before( function (done) {
		// Clear Test Database and Repopulate
		var tldr1 = new TldrModel({
			_id: 1,
			clean_url: 'http://needforair.com',
			summary: 'No I Need for Space',
		}),
				tldr2 = new TldrModel({
			_id: 2,
			clean_url: 'http://www.avc.com',
			summary: 'Fred Wilson is my god',
		}),
				tldr3 = new TldrModel({
			_id: 3,
			clean_url: 'http://www.bothsidesofthetable.com',
			summary: 'Sustering is my religion',
		});
		TldrModel.remove(null, function (err) {
		  if (err) {throw done(err);}
			tldr1.save(	function (err) {
				if (err) {throw done(err); }
			  tldr2.save( function (err) {
					if (err) {throw done(err); }
			    tldr3.save( function (err) {
			      if (err) {throw done(err); }
						done();
			    });
			  });
			});
		});
	});

  it('Global number', function (done) {
    TldrModel.find(null, function (err, docs) {
			docs.should.have.length(3);
			done();
    });
  });

	it('Query by index', function (done) {
	  TldrModel.find( {_id: 1}, function (err, docs) {
			docs[0].clean_url.should.equal('http://needforair.com');
			done();
	  });
	});

});
