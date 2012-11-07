/**
 * Custom utils tests
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */


var should = require('chai').should()
  , assert = require('chai').assert
  , _ = require('underscore')
  , i18n = require('../lib/i18n')
  , customUtils = require('../lib/customUtils')
  ;


describe('Custom utils', function () {

  describe('#timeago', function () {
    it('Should return just ago if span is under a minute', function (done) {
      var test;

      test = new Date((new Date()).getTime() - 10);
      customUtils.timeago(test).should.equal('just now');

      test = new Date((new Date()).getTime() - 900);
      customUtils.timeago(test).should.equal('just now');

      done();
    });

    it('Should return a nicely formatted timeago', function (done) {
      var test;

      test = new Date((new Date()).getTime() - 1000 * 60 * 4);
      customUtils.timeago(test).should.equal('4 minutes ago');

      test = new Date((new Date()).getTime() - 1000 * 61);
      customUtils.timeago(test).should.equal('a minute ago');

      test = new Date((new Date()).getTime() - 1000 * 60 * 60 * 24 * 12);
      customUtils.timeago(test).should.equal('12 days ago');

      done();
      // code ...
    });


  });   // ==== End of '#timeago' ==== //


});

