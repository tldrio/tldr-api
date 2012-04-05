
/**
 * Database tests
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */


var should = require('chai').should()
  , assert = require('chai').assert
  , restify = require('restify')
  , sinon = require('sinon')
  , bunyan = require('../lib/logger').bunyan // Audit logger for restify
  , mongoose = require('mongoose') // Mongoose ODM to Mongo
  , models = require('../models')
  , db = require('../lib/db')
	, TldrModel = models.TldrModel
  , server = require('../server')
  , customErrors = require('../lib/errors');





/**
 * Tests
 */

describe('TldrModel', function () {

  describe('#validators', function () {

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

    it('should detect missing required _id arg', function (done) {
      var tldr = new TldrModel({
        url: 'needforair.com/nutcrackers',
        hostname: 'needforair.com',
        summary: 'Awesome Blog',
      });
      tldr.save( function (err) {
        err.name.should.equal('ValidationError');
				//models.getAllValidationErrors(err.errors).length.should.equal(2);
				//console.log(models.getAllValidationErrorsInNiceJSON(err.errors));
        done();
      });
    });

    it('should detect missing required url arg', function (done) {
      var tldr = new TldrModel({
        _id: 'c63588884fecf318d13fc3cf3598b19f4f461d21',
        hostname: 'needforair.com',
        summary: 'Awesome Blog',
      });
      tldr.save( function (err) {
        err.name.should.equal('ValidationError');
        done();
      });
    });
    
    it('should detect missing required summary arg', function (done) {
      var tldr = new TldrModel({
        _id: 'c63588884fecf318d13fc3cf3598b19f4f461d21',
        url: 'needforair.com/nutcrackers',
        hostname: 'needforair.com',
      });
      tldr.save( function (err) {
        err.name.should.equal('ValidationError');
        done();
      });
    });

    it('should detect missing required hostname arg', function (done) {
      var tldr = new TldrModel({
        _id: 'c63588884fecf318d13fc3cf3598b19f4f461d21',
        url: 'needforair.com/nutcrackers',
        summary: 'Awesome Blog',
      });
      tldr.save( function (err) {
        err.name.should.equal('ValidationError');
        done();
      });
    });

    it('should detect bad hostname format', function (done) {
      var tldr = new TldrModel({
        _id: 'c63588884fecf318d13fc3cf3598b19f4f461d21',
        url: 'needforair.com/nutcrackers',
        hostname: 'needforair',
        summary: 'Awesome Blog',
      });
      tldr.save( function (err) {
        err.name.should.equal('ValidationError');
        done();
      });
    });

    it('should handle wrong type of arg', function (done) {
      var parasite = {foo: 'bar'}
        , tldr = new TldrModel({
            _id: 'c63588884fecf318d13fc3cf3598b19f4f461d21',
            url: 'http://needforair.com/nutcrackers',
            hostname: 'needforair.com',
            summary: parasite,
      });
      tldr.save( function (err) {
        err.name.should.equal('ValidationError');
        done();
      });
    });

    it('should handle wrong url formatting', function (done) {
      var tldr = new TldrModel({
        _id: 'c63588884fecf318d13fc3cf3598b19f4f461d21',
        url: 'needforair.com/nutcrackers',
        hostname: 'needforair.com',
        summary: 'Awesome Blog',
      });
      tldr.save( function (err) {
        err.name.should.equal('ValidationError');
        done();
      });
    });

  });

  describe('#createTldr', function () {

    it('should create a tldr given valid {url, summary}', function () {
      var tldr = TldrModel.createTldr({url: 'http://needforair.com/nutcrackers', summary: 'Awesome Blog'});

      tldr.should.have.property('url');
      tldr.should.have.property('summary');
      tldr.should.have.property('hostname');
      tldr.url.should.equal('http://needforair.com/nutcrackers');
      tldr.summary.should.equal('Awesome Blog');
      tldr.hostname.should.equal('needforair.com');
      tldr._id.should.equal('c63588884fecf318d13fc3cf3598b19f4f461d21');
    });

    it('should handle no args', function (done) {
      try {
        TldrModel.createTldr();
      } catch(err) {
        err.should.be.an.instanceOf(customErrors.MissingArgumentError);
        done();
      }
    });

    it('should hanlde missing summary arg ', function (done) {
      try {
        TldrModel.createTldr({url: 'bla'});
      } catch(err) {
        err.should.be.an.instanceOf(customErrors.MissingArgumentError);
        done();
      }
    });

    it('should handle missing url arg', function (done) {
      try {
        TldrModel.createTldr({summary: 'coin'});
      } catch(err) {
        err.should.be.an.instanceOf(customErrors.MissingArgumentError);
        done();
      }
    });

    it('should detect bad input type', function (done) {
      try {
        TldrModel.createTldr({url: 123, summary: 'Awesome Blog'});
      } catch(err) {
        err.should.be.an.instanceOf(TypeError);
        done();
      }
    });

  });

});

