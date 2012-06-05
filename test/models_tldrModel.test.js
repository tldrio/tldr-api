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
  , mongoose = require('mongoose') // ODM for Mongo
  , models = require('../models')
  , db = require('../lib/db')
	, TldrModel = models.TldrModel
  , server = require('../server')
  , url = require('url');





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
					summaryBullets: ['Awesome Blog'],
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

    it('should accept only valid urls ', function (done) {

      var tldrData = {
          _id: 'http://myfile/movie',
					title: 'Blog NFA',
					summaryBullets: ['Awesome Blog'],
          resourceAuthor: 'NFA Crew',
          resourceDate: '2012',
					createdAt: new Date(),
					updatedAt: new Date()}
        , tldr = new TldrModel(tldrData)
        , valErr;

      tldr.save( function (err) {
        err.name.should.equal('ValidationError');

        _.keys(err.errors).length.should.equal(1);
				valErr = models.getAllValidationErrorsWithExplanations(err.errors);
				valErr._id.should.not.equal(null);

        tldrData._id = "ftp://myfile.tld/movie"
        tldr = new TldrModel(tldrData);
        tldr.save( function (err) {
          valErr = models.getAllValidationErrorsWithExplanations(err.errors);
          valErr._id.should.not.equal(null);

          tldrData._id = "http://myfile.tld/movie"
          tldr = new TldrModel(tldrData);
          tldr.save( function (err) {
            assert.isNull(err);

            done();
          });
        });
      });

    });

    it('should use default createdAt and updatedAt args', function (done) {

      var tldr = new TldrModel({
					_id: 'http://needforair.com/nutcrackers',
					title: 'Blog NFA',
					summaryBullets: ['Awesome Blog'],
          resourceAuthor: 'NFA Crew',
          resourceDate: '2012'
				})
				, valErr;

      tldr.save( function (err) {
        assert.isNull(err, 'no errors');

        done();
      });

    });
    
    it('should detect missing required summary arg', function (done) {

      var tldr = new TldrModel({
          _id: 'http://needforair.com/nutcrackers',
          title: 'Blog NFA',
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
				valErr.summaryBullets.should.not.equal(null);

        done();
      });

    });

    it('should detect missing required resourceAuthor', function (done) {

      var tldr = new TldrModel({
          _id: 'http://needforair.com/nutcrackers',
          title: 'Blog NFA',
          summaryBullets: ['Awesome Blog'],
          resourceDate: '2012',
					createdAt: new Date(),
					updatedAt: new Date()
      })
        , valErr;

      tldr.save( function (err) {
        err.name.should.equal('ValidationError');

        _.keys(err.errors).length.should.equal(1);
				valErr = models.getAllValidationErrorsWithExplanations(err.errors);
				valErr.resourceAuthor.should.not.equal(null);

        done();
      });

    });

    it('should detect wrong type of arg for dates bitch', function (done) {

      var tldr = new TldrModel({
        _id: 'http://needforair.com/nutcrackers',
        title: 'Blog NFA',
        summaryBullets: ['Awesome Blog'],
        resourceAuthor: 'NFA Crew',
        resourceDate: 'NFA Crew',
        createdAt: 'eiugherg',
        updatedAt: '2012'
      })
      , valErr;

      tldr.save( function (err) {
        err.name.should.equal('CastError');
        done();
      });

    });


    it('should reject tldrs whose summary is missing', function (done) {

      var tldr = new TldrModel({
        _id: 'http://needforair.com/nutcrackers',
        title: 'Blog NFA',
        resourceAuthor: 'NFA Crew',
        resourceDate: '2012',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      , valErr;

      tldr.save( function (err) {
        err.name.should.equal('ValidationError');
        done();
      });

    });


    it('should reject tldrs whose summary is an empty array', function (done) {

      var tldr = new TldrModel({
        _id: 'http://needforair.com/nutcrackers',
        title: 'Blog NFA',
        summaryBullets: [],
        resourceAuthor: 'NFA Crew',
        resourceDate: '2012',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      , valErr;

      tldr.save( function (err) {
        err.name.should.equal('ValidationError');
        done();
      });

    });


    it('should reject tldrs whose summary contains empty bullets', function (done) {

      var tldr = new TldrModel({
        _id: 'http://needforair.com/nutcrackers',
        title: 'Blog NFA',
        summaryBullets: ['weqrqweqw eqwe qwe', '', 'amnother bullet'],
        resourceAuthor: 'NFA Crew',
        resourceDate: '2012',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      , valErr;

      tldr.save( function (err) {
        err.name.should.equal('ValidationError');
        done();
      });

    });


    it('should reject tldrs whose summary contains too many bullets', function (done) {

      var tldr = new TldrModel({
        _id: 'http://needforair.com/nutcrackers',
        title: 'Blog NFA',
        summaryBullets: ['weqrqweqw eqwe qwe', 'adad', 'amnother bullet', 'eweqweq', 'qweqwe', 'qweqweqwe'],
        resourceAuthor: 'NFA Crew',
        resourceDate: '2012',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      , valErr;

      tldr.save( function (err) {
        err.name.should.equal('ValidationError');
        done();
      });

    });


    it('should reject tldrs whose summary contains a bullet that\'s too long', function (done) {

      var tldr = new TldrModel({
        _id: 'http://needforair.com/nutcrackers',
        title: 'Blog NFA',
        summaryBullets: ['weqrqweqw eqwe qwe', 'adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee adadeeeee w'],
        resourceAuthor: 'NFA Crew',
        resourceDate: '2012',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      , valErr;

      tldr.save( function (err) {
        err.name.should.equal('ValidationError');
        done();
      });

    });


  });



  describe('#createAndSaveInstance', function () {

    it('should allow user to set _id, title, summary and resourceAuthor only', function (done) {
      TldrModel.createAndSaveInstance('http://mydomain.com',
				{ title: 'Blog NFA'
				, summaryBullets: ['coin']
				, resourceAuthor: 'bloup'
				, createdAt: '2012'}, 
				function (err) { 
					if (err) { return done(err); } 
					TldrModel.find({resourceAuthor: 'bloup'}, function (err,docs) {
						if (err) { return done(err); }

						var tldr = docs[0];
						tldr._id.should.equal('http://mydomain.com/');
						tldr.summaryBullets.should.include('coin');
						tldr.resourceAuthor.should.equal('bloup');
						tldr.createdAt.should.not.equal('2012');

						done();
					});
				});
    });

	});

	describe('#updateValidFields', function () {

		it('should restrict the fields the user is allowed to update', function (done) {
				var updated = {_id: 'http://myotherdomain.com'
											, summaryBullets: ['new2']
											, title: 'Blog NeedForAir'
											, resourceAuthor: 'new3'
											, createdAt: '2012'};

      TldrModel.createAndSaveInstance('http://mydomain.com',
				{ title: 'Blog NFA'
				, summaryBullets: ['coin']
				, resourceAuthor: 'bloup'}, 
				function(err) { 
					if (err) { return done(err); }
					TldrModel.find({resourceAuthor: 'bloup'}, function (err,docs) {
						if (err) { return done(err); }

						var tldr = docs[0];
						tldr._id.should.equal('http://mydomain.com/');
						tldr.summaryBullets.should.include('coin');
						tldr.title.should.equal('Blog NFA');
						tldr.resourceAuthor.should.equal('bloup');
						
						// Perform update
						tldr.updateValidFields(updated, function(err) {
							if (err) { return done(err); }

							tldr._id.should.equal('http://mydomain.com/');
							tldr.summaryBullets.should.include('new2');
							tldr.title.should.equal('Blog NeedForAir');
							tldr.resourceAuthor.should.equal('new3');
              tldr.createdAt.should.not.equal('2012');

							done();
						});
					});
				});
		});
  });


  describe('methods.normalizeUrl', function() {

    it('Should keep correctly formatted urls unchanged and don\'t tamper with trailing slashes', function (done) {
      var theUrl = "http://domain.tld/path/file.extension";
      TldrModel.normalizeUrl(theUrl).should.equal("http://domain.tld/path/file.extension");

      var theUrl = "http://domain.tld/path/res/";
      TldrModel.normalizeUrl(theUrl).should.equal("http://domain.tld/path/res/");

      done();
    });

    it('Should keep correctly formatted urls with only domain/subdomain, adding a forgotten trailing slash', function (done) {
      var theUrl = "http://domain.tld/";
      TldrModel.normalizeUrl(theUrl).should.equal("http://domain.tld/");

      var theUrl = "http://domain.tld";
      TldrModel.normalizeUrl(theUrl).should.equal("http://domain.tld/");

      var theUrl = "http://subdomain.domain.tld/";
      TldrModel.normalizeUrl(theUrl).should.equal("http://subdomain.domain.tld/");

      var theUrl = "http://subdomain.domain.tld";
      TldrModel.normalizeUrl(theUrl).should.equal("http://subdomain.domain.tld/");

      done();
    });

    it('Should remove a trailing hash', function (done) {
      var theUrl = "http://www.domain.tld/path/file.extension/#";

      TldrModel.normalizeUrl(theUrl).should.equal("http://www.domain.tld/path/file.extension/");

      done();
    });

    it('Should remove a trailing query', function (done) {
      var theUrl = "http://subdomain.domain.tld/path/file.extension/?arg=value&arg2=value2";

      TldrModel.normalizeUrl(theUrl).should.equal("http://subdomain.domain.tld/path/file.extension/");

      done();
    });





  });



});
