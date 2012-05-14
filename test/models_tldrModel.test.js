/**
 * TldrModel tests
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */


var should = require('chai').should()
  , assert = require('chai').assert
  , _ = require('underscore')
  , restify = require('restify')
  , sinon = require('sinon')
  , bunyan = require('../lib/logger').bunyan // Audit logger for restify
  , mongoose = require('mongoose') // Mongoose ODM to Mongo
  , models = require('../models')
  , db = require('../lib/db')
	, TldrModel = models.TldrModel
  , server = require('../server');





/**
 * Tests
 */


describe('TldrModel', function () {

  before(function (done) {
    db.connectToDatabase(done);
  });

  after(function (done) {
    db.closeDatabaseConnection(done);
  });

  beforeEach(function (done) {
    TldrModel.remove( function (err) {
      if (err) {throw done(err);}
      done();
    });
  });


  describe('#validators', function () {

    it('should detect missing required _id arg', function (done) {

      var tldr = new TldrModel({
					title: 'Blog NFA',
					summary: 'Awesome Blog',
          resourceAuthor: 'NFA Crew',
          resourceDate: '2012',
					createdAt: new Date(),
					updatedAt: new Date()
				})
        , valErr;

      tldr.save( function (err) {
        err.name.should.equal('ValidationError');

        _.keys(err.errors).length.should.equal(1);
				valErr = models.getAllValidationErrorsWithExplanations(err.errors);
				valErr._id.should.not.equal(null);

        done();
      });

    });

    it('should detect missing required createdAt and updatedAt args', function (done) {

      var tldr = new TldrModel({
					_id: 'http://needforair.com/nutcrackers',
					title: 'Blog NFA',
					summary: 'Awesome Blog',
          resourceAuthor: 'NFA Crew',
          resourceDate: '2012'
				})
				, valErr;

      tldr.save( function (err) {
        err.name.should.equal('ValidationError');
				
        _.keys(err.errors).length.should.equal(2);
				valErr = models.getAllValidationErrorsWithExplanations(err.errors);
				valErr.createdAt.should.not.equal(null);
				valErr.updatedAt.should.not.equal(null);

        done();
      });

    });
    
    it('should detect missing required summary arg', function (done) {

      var tldr = new TldrModel({
          _id: 'needforair.com/nutcrackers',
          title: 'Blog NFA',
          resourceAuthor: 'NFA Crew',
          resourceDate: '2012',
					createdAt: new Date(),
					updatedAt: new Date()
      })
        , valErr;

      tldr.save( function (err) {
        err.name.should.equal('ValidationError');

        _.keys(err.errors).length.should.equal(2);
				valErr = models.getAllValidationErrorsWithExplanations(err.errors);
				valErr.summary.should.not.equal(null);

        done();
      });

    });

    it('should detect missing required resourceAuthor', function (done) {

      var tldr = new TldrModel({
          _id: 'needforair.com/nutcrackers',
          title: 'Blog NFA',
          summary: 'Awesome Blog',
          resourceDate: '2012',
					createdAt: new Date(),
					updatedAt: new Date()
      })
        , valErr;

      tldr.save( function (err) {
        err.name.should.equal('ValidationError');

        _.keys(err.errors).length.should.equal(2);
				valErr = models.getAllValidationErrorsWithExplanations(err.errors);
				valErr.resourceAuthor.should.not.equal(null);

        done();
      });

    });

    it('should detect missing required resourceDate', function (done) {

      var tldr = new TldrModel({
          _id: 'needforair.com/nutcrackers',
          title: 'Blog NFA',
          summary: 'Awesome Blog',
          resourceAuthor: 'NFA Crew',
					createdAt: new Date(),
					updatedAt: new Date()
      })
        , valErr;

      tldr.save( function (err) {
        err.name.should.equal('ValidationError');

        _.keys(err.errors).length.should.equal(2);
				valErr = models.getAllValidationErrorsWithExplanations(err.errors);
				valErr.resourceDate.should.not.equal(null);

        done();
      });

    });

    it('should handle wrong type of arg', function (done) {

      var parasite = {foo: 'bar'}
        , tldr = new TldrModel({
            _id: 'c63588884fecf318d13fc3cf3598b19f4f461d21',
            title: 'Blog NFA',
            summary: parasite,
      })
        , valErr;

      tldr.save( function (err) {
        err.name.should.equal('ValidationError');
				valErr = models.getAllValidationErrorsWithExplanations(err.errors);
        valErr.summary.should.be.a('string');
        done();
      });

    });

    it('should handle wrong url formatting', function (done) {

      var tldr = new TldrModel({
        _id: 'needforair.com/nutcrackers',
        title: 'Blog NFA',
        summary: 'Awesome Blog',
      });

      tldr.save( function (err) {
        err.name.should.equal('ValidationError');
        done();
      });

    });

  });

 

  describe('#createInstance', function () {

    it('should remove querystring from url', function (done) {
      TldrModel.createInstance('http://mydomain.com?toto=tata&titi=tutu',
				{ title: 'Some Title'
				, summary: 'Summary is good'
				,	resourceAuthor: 'John'}, 
				function (err) { 
					if (err) { return done(err); } 
					TldrModel.find({resourceAuthor: 'John'}, function (err,docs) {
						if (err) { return done(err); } 

						var tldr = docs[0];
						tldr._id.should.equal('http://mydomain.com/');

						done();
					});
				});
		});

    it('should remove querystring from url', function (done) {
      TldrModel.createInstance('http://mydomain.com#anchor',
				{	title: 'Some Title'
				, summary: 'Summary is good'
				, resourceAuthor: 'John'}, 
				function (err) { 
					if (err) { return done(err); } 
					TldrModel.find({resourceAuthor: 'John'}, function (err,docs) {
						if (err) { return done(err); } 

						var tldr = docs[0];
						tldr._id.should.equal('http://mydomain.com/');

						done();
					});
				});
    });
    

    it('should allow user to set _id, title, summary and resourceAuthor only', function (done) {
      TldrModel.createInstance('http://mydomain.com',
				{ title: 'Blog NFA'
				, summary: 'coin'
				, resourceAuthor: 'bloup'
				, unusedField: 'glok'}, 
				function (err) { 
					if (err) { return done(err); } 
					TldrModel.find({resourceAuthor: 'bloup'}, function (err,docs) {
						if (err) { return done(err); } 

						var tldr = docs[0];
						tldr._id.should.equal('http://mydomain.com/');
						tldr.summary.should.equal('coin');
						tldr.resourceAuthor.should.equal('bloup');
						tldr.should.not.have.property('unusedField');

						done();
					});
				});
    });

	});

	describe('#updateValidFields', function () {

		it('should restrict the fields the user is allowed to update', function (done) {
				var updated = {_id: 'http://myotherdomain.com'
											, summary: 'new2'
											, title: 'Blog NeedForAir'
											, resourceAuthor: 'new3'
											, unusedField: 'new4'};

      TldrModel.createInstance('http://mydomain.com',
				{ title: 'Blog NFA'
				, summary: 'coin'
				, resourceAuthor: 'bloup'
				, unusedField: 'glok'}, 
				function(err) { 
					if (err) { return done(err); }
					TldrModel.find({resourceAuthor: 'bloup'}, function (err,docs) {
						if (err) { return done(err); } 

						var tldr = docs[0];
						tldr._id.should.equal('http://mydomain.com/');
						tldr.summary.should.equal('coin');
						tldr.title.should.equal('Blog NFA');
						tldr.resourceAuthor.should.equal('bloup');
						
						// Perform update
						tldr.updateValidFields(updated, function(err) { 
							if (err) { return done(err); }

							tldr._id.should.equal('http://mydomain.com/');
							tldr.summary.should.equal('new2');
							tldr.title.should.equal('Blog NeedForAir');
							tldr.resourceAuthor.should.equal('new3');
							tldr.should.not.have.property('unusedField');

							done();
						});
					});
				});
		});

  });

});
