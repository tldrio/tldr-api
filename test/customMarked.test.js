/**
 * Custom Marked tests
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */


var should = require('chai').should()
  , assert = require('chai').assert
  , _ = require('underscore')
  , i18n = require('../lib/i18n')
  , marked = require('../lib/customMarked')
  ;

describe.only('Custom Marked', function () {

  // Prevent users from giving us custom markup. Very important to prevent people from breaking the page layout.
  it('Should satinize markup inputed by users', function (done) {
    var text;

    text = "<a href='http://link'>BAD</a>";
    marked(text).should.contain('&lt;');   // Markup was escaped

    text = "and a bad <open tag";
    marked(text).should.contain('&lt;');   // Markup was escaped

    done();
  });

});
