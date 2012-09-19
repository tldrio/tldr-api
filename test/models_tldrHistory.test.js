/**
 * Tldr History tests
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */


var should = require('chai').should()
  , assert = require('chai').assert
  , i18n = require('../lib/i18n')
  , mongoose = require('mongoose')
  , models = require('../lib/models')
  , TldrHistory = models.TldrHistory
  , server = require('../server')
  , db = server.db;





/**
 * Tests
 */


describe('TldrHistory', function () {

  before(function (done) {
    db.connectToDatabase(done);
  });

  after(function (done) {
    db.closeDatabaseConnection(done);
  });

  beforeEach(function (done) {
    TldrHistory.remove({}, function (err) {
      if (err) {throw done(err);}
      done();
    });
  });


  describe('Basic behaviour', function () {
    it('Should create an history thats only the empty versions array', function (done) {
      var history = new TldrHistory();
      history.versions.length.should.equal(0);
      done();
    });

    it('Should create new versions with method saveVersion and save them in the latest to oldest order and with the right creator', function (done) {
      var history = new TldrHistory();
      history.versions.length.should.equal(0);

      history.saveVersion('first blob', '111111111111111111111111', function() {
        history.saveVersion('second blob', '111111111111111111111111', function() {
          history.versions[0].data.should.equal('second blob');
          history.versions[0].creator.toString().should.equal('111111111111111111111111');
          history.versions[1].data.should.equal('first blob');

          history.saveVersion('third blob', '222222222222222222222222', function() {
            history.versions[0].data.should.equal('third blob');
            history.versions[0].creator.toString().should.equal('222222222222222222222222');

            done();
          });
        });
      });

    });


  });
});
