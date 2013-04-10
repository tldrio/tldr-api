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
    it('Should return just ago if span is under a minute', function () {
      var test;

      test = new Date((new Date()).getTime() - 10);
      customUtils.timeago(test).should.equal('just now');

      test = new Date((new Date()).getTime() - 900);
      customUtils.timeago(test).should.equal('just now');
    });

    it('Should return a nicely formatted timeago', function () {
      var test;

      test = new Date((new Date()).getTime() - 1000 * 60 * 4);
      customUtils.timeago(test).should.equal('4 minutes ago');

      test = new Date((new Date()).getTime() - 1000 * 61);
      customUtils.timeago(test).should.equal('a minute ago');

      test = new Date((new Date()).getTime() - 1000 * 60 * 60 * 24 * 12);
      customUtils.timeago(test).should.equal('12 days ago');
    });

  });   // ==== End of '#timeago' ==== //


  describe('Slugification', function () {

    it('Should lowercase all upper case letter', function () {
      var input;

      input = "SalUT";
      customUtils.slugify(input).should.equal("salut");
    });

    it('Should replace non English characters by English ones', function () {
      var input;

      input = "ééèêëẽáàâäãúùûüũíìîïĩóòôöõýỳŷÿỹ";
      customUtils.slugify(input).should.equal("eeeeeeaaaaauuuuuiiiiioooooyyyyy");
    });

    it('Should use only a dash as delimiter', function () {
      var input;

      input = "Salut/ca\\farte_fourte-firte";
      customUtils.slugify(input).should.equal("salut-ca-farte-fourte-firte");
    });

    it('Should remove all unexpected characters', function () {
      var input;

      input = "Salut ca farte??? 145 fois";
      customUtils.slugify(input).should.equal("salut-ca-farte-145-fois");

      input = "lemonde.fr et,la;ca va";
      customUtils.slugify(input).should.equal("lemonde-fr-et-la-ca-va");
    });

    it('Should collapse multiple successive dash into only one', function () {
      var input;

      input = "Salut   ca farte - hn.com";
      customUtils.slugify(input).should.equal("salut-ca-farte-hn-com");
    });


  });   // ==== End of 'Slugification' ==== //

  describe('#upsertKVInArray', function () {

    it('Should not touch the array if key or value is missing', function () {
      var a = [
                { key: 'k1', value: 'v1' }
              , { key: 'k2', value: 'v2' }
              , { key: 'k3', value: 'v3' }
              ];

      a = customUtils.upsertKVInArray(a, 'bloup');
      a[0].key.should.equal('k1');
      a[1].key.should.equal('k2');
      a[2].key.should.equal('k3');
      a[0].value.should.equal('v1');
      a[1].value.should.equal('v2');
      a[2].value.should.equal('v3');

      a = customUtils.upsertKVInArray(a, null, 'bloup');
      a[0].key.should.equal('k1');
      a[1].key.should.equal('k2');
      a[2].key.should.equal('k3');
      a[0].value.should.equal('v1');
      a[1].value.should.equal('v2');
      a[2].value.should.equal('v3');
    });

    it('Should update the key if it exists', function () {
      var a = [
                { key: 'k1', value: 'v1' }
              , { key: 'k2', value: 'v2' }
              , { key: 'k3', value: 'v3' }
              ];

      a = customUtils.upsertKVInArray(a, 'k2', 'bloup');
      a[0].key.should.equal('k1');
      a[1].key.should.equal('k2');
      a[2].key.should.equal('k3');
      a[0].value.should.equal('v1');
      a[1].value.should.equal('bloup');
      a[2].value.should.equal('v3');
    });

    it('Should add the key if it doesnt exist', function () {
      var a = [
                { key: 'k1', value: 'v1' }
              , { key: 'k2', value: 'v2' }
              , { key: 'k3', value: 'v3' }
              ];

      a = customUtils.upsertKVInArray(a, 'kk', 'bloup');
      a[0].key.should.equal('k1');
      a[1].key.should.equal('k2');
      a[2].key.should.equal('k3');
      a[3].key.should.equal('kk');
      a[0].value.should.equal('v1');
      a[1].value.should.equal('v2');
      a[2].value.should.equal('v3');
      a[3].value.should.equal('bloup');
    });

    it('An empty string is not an empty value', function () {
      var a = [
                { key: 'k1', value: 'v1' }
              , { key: 'k2', value: 'v2' }
              , { key: 'k3', value: 'v3' }
              ];

      a = customUtils.upsertKVInArray(a, 'kk', '');
      a[0].key.should.equal('k1');
      a[1].key.should.equal('k2');
      a[2].key.should.equal('k3');
      a[3].key.should.equal('kk');
      a[0].value.should.equal('v1');
      a[1].value.should.equal('v2');
      a[2].value.should.equal('v3');
      a[3].value.should.equal('');
    });

  });   // ==== End of '#upsertKVInArray' ==== //


  describe('sanitize number', function () {

    it('If its parsable, parse it', function () {
      customUtils.sanitizeNumber(412).should.equal(412);
      customUtils.sanitizeNumber("412redd").should.equal(412);
    });

    it('If its not parsable, return undefined', function () {
      assert.isUndefined(customUtils.sanitizeNumber(null));
      assert.isUndefined(customUtils.sanitizeNumber(undefined));
      assert.isUndefined(customUtils.sanitizeNumber("ddd412redd"));
      assert.isUndefined(customUtils.sanitizeNumber("document.write("));
    });

  });   // ==== End of 'sanitize number' ==== //


  describe('Decrease date resolution', function () {

    it('To the day', function () {
      var date;

      date = new Date(1985, 7, 20, 20, 0, 5, 938);
      customUtils.getDayResolution(date).getTime().should.equal((new Date(1985, 7, 20)).getTime());
    });

    it('To the month', function () {
      var date;

      date = new Date(1985, 7, 20, 20, 0, 5, 938);
      customUtils.getMonthResolution(date).getTime().should.equal((new Date(1985, 7, 1)).getTime());
    });

  });   // ==== End of 'Decrease date resolution' ==== //


  describe('Get previous period', function () {

    it('Get previous day', function () {
      var date;

      date = new Date(1985, 7, 20, 20, 0, 5, 938);
      customUtils.getPreviousDay(date).getTime().should.equal((new Date(1985, 7, 19, 20, 0, 5, 938)).getTime());

      date = new Date(1985, 7, 1, 20, 0, 5, 938);
      customUtils.getPreviousDay(date).getTime().should.equal((new Date(1985, 6, 31, 20, 0, 5, 938)).getTime());

      date = new Date(1985, 0, 1, 20, 0, 5, 938);
      customUtils.getPreviousDay(date).getTime().should.equal((new Date(1984, 11, 31, 20, 0, 5, 938)).getTime());
    });

    it('Get previous month', function () {
      var date;

      date = new Date(1985, 7, 20, 20, 0, 5, 938);
      customUtils.getPreviousMonth(date).getTime().should.equal((new Date(1985, 6, 20, 20, 0, 5, 938)).getTime());

      date = new Date(1985, 0, 20, 20, 0, 5, 938);
      customUtils.getPreviousMonth(date).getTime().should.equal((new Date(1984, 11, 20, 20, 0, 5, 938)).getTime());
    });

  });   // End of 'Get previous period' ==== //


  describe('#getWordCount', function () {

    it('With a string', function () {
      customUtils.getWordCount('Hello how are you motherfucker? This is a string.').should.equal(9);
    });

    it('With an array', function () {
      customUtils.getWordCount(['Hello how are you motherfucker?', 'This is a string.']).should.equal(9);
    });

    it('With null or undefined', function () {
      customUtils.getWordCount().should.equal(0);
      customUtils.getWordCount(undefined).should.equal(0);
    });

  });   // ==== End of '#getWordCount' ==== //


  describe('Time series treatment', function () {

    it('Can fill daily gaps in time series', function () {
      var data = [ { timestamp: new Date(2004, 7, 13), something: 42 }
                 , { timestamp: new Date(2004, 7, 14), something: 13 }
                 , { timestamp: new Date(2004, 7, 17), something: 99 }
                 , { timestamp: new Date(2004, 7, 16), something: 9 }
                 , { timestamp: new Date(2004, 7, 20), something: 1 }
                 ]
        , filledData = customUtils.fillGapsInTimeSeries(data)
        , data2 = [ { timestamp: new Date(2004, 6, 29), something: 42 }
                  , { timestamp: new Date(2004, 7, 2), something: 1 }
                  ]
        , filledData2 = customUtils.fillGapsInTimeSeries(data2)
        ;

      // Within a a month
      filledData.length.should.equal(8);

      filledData[0].timestamp.getTime().should.equal((new Date(2004, 7, 13)).getTime());
      filledData[0].something.should.equal(42);

      filledData[1].timestamp.getTime().should.equal((new Date(2004, 7, 14)).getTime());
      filledData[1].something.should.equal(13);

      filledData[2].timestamp.getTime().should.equal((new Date(2004, 7, 15)).getTime());
      assert.isUndefined(filledData[2].something);

      filledData[3].timestamp.getTime().should.equal((new Date(2004, 7, 16)).getTime());
      filledData[3].something.should.equal(9);

      filledData[4].timestamp.getTime().should.equal((new Date(2004, 7, 17)).getTime());
      filledData[4].something.should.equal(99);

      filledData[5].timestamp.getTime().should.equal((new Date(2004, 7, 18)).getTime());
      assert.isUndefined(filledData[5].something);

      filledData[6].timestamp.getTime().should.equal((new Date(2004, 7, 19)).getTime());
      assert.isUndefined(filledData[6].something);

      filledData[7].timestamp.getTime().should.equal((new Date(2004, 7, 20)).getTime());
      filledData[7].something.should.equal(1);

      // Across months
      filledData2.length.should.equal(5);
      filledData2[0].timestamp.getTime().should.equal((new Date(2004, 6, 29)).getTime());
      filledData2[0].something.should.equal(42);

      filledData2[1].timestamp.getTime().should.equal((new Date(2004, 6, 30)).getTime());
      assert.isUndefined(filledData2[1].something);

      filledData2[2].timestamp.getTime().should.equal((new Date(2004, 6, 31)).getTime());
      assert.isUndefined(filledData2[2].something);

      filledData2[3].timestamp.getTime().should.equal((new Date(2004, 7, 1)).getTime());
      assert.isUndefined(filledData2[3].something);

      filledData2[4].timestamp.getTime().should.equal((new Date(2004, 7, 2)).getTime());
      filledData2[4].something.should.equal(1);
    });

    it('Can fill monthly gaps in time series', function () {
      var data = [ { timestamp: new Date(2004, 2), something: 42 }
                 , { timestamp: new Date(2004, 5), something: 13 }
                 , { timestamp: new Date(2004, 4), something: 99 }
                 , { timestamp: new Date(2003, 11), something: 9 }
                 ]
        , filledData = customUtils.fillGapsInTimeSeries(data, 'monthly')
        ;

      filledData.length.should.equal(7);

      filledData[0].timestamp.getTime().should.equal((new Date(2003, 11)).getTime());
      filledData[0].something.should.equal(9);

      filledData[1].timestamp.getTime().should.equal((new Date(2004, 0)).getTime());
      assert.isUndefined(filledData[1].something);

      filledData[2].timestamp.getTime().should.equal((new Date(2004, 1)).getTime());
      assert.isUndefined(filledData[2].something);

      filledData[3].timestamp.getTime().should.equal((new Date(2004, 2)).getTime());
      filledData[3].something.should.equal(42);

      filledData[4].timestamp.getTime().should.equal((new Date(2004, 3)).getTime());
      assert.isUndefined(filledData[4].something);

      filledData[5].timestamp.getTime().should.equal((new Date(2004, 4)).getTime());
      filledData[5].something.should.equal(99);

      filledData[6].timestamp.getTime().should.equal((new Date(2004, 5)).getTime());
      filledData[6].something.should.equal(13);
    });

    it('Add extremes', function () {
      var data = [ { timestamp: new Date(2004, 2), something: 42 }
                 , { timestamp: new Date(2004, 5), something: 13 }
                 , { timestamp: new Date(2004, 4), something: 99 }
                 ]
        , extremeData1 = customUtils.addExtremesIfNecessary(data.slice(0), 'monthly', new Date(2004, 2), new Date(2004, 5))
        , extremeData2 = customUtils.addExtremesIfNecessary(data.slice(0), 'monthly', new Date(2004, 0), new Date(2004, 5))
        , extremeData3 = customUtils.addExtremesIfNecessary(data.slice(0), 'monthly', new Date(2004, 2), new Date(2004, 6))
        , extremeData4 = customUtils.addExtremesIfNecessary(data.slice(0), 'monthly', new Date(2004, 1), new Date(2004, 7))
        ;

      extremeData1.length.should.equal(3);

      extremeData2.length.should.equal(4);
      extremeData2[0].timestamp.getTime().should.equal((new Date(2004, 0)).getTime());

      extremeData3.length.should.equal(4);
      extremeData3[3].timestamp.getTime().should.equal((new Date(2004, 6)).getTime());

      extremeData4.length.should.equal(5);
      extremeData4[0].timestamp.getTime().should.equal((new Date(2004, 1)).getTime());
      extremeData4[4].timestamp.getTime().should.equal((new Date(2004, 7)).getTime());
    });

  });   // ==== End of 'Time series treatment' ==== //


  describe('#getSubAdressedGmails', function () {

    it('Given a Gmail address, should return a regex that matches it and it subaddresses only', function () {
      var add = "louis.chatriot@gmail.com"
        , re = customUtils.getSubAdressedGmails(add)
        ;

      // We don't treat the dots in the addresses, its a very rare and shitty case
      assert.isNull('louischatriot@gmail.com'.match(re));
      assert.isNull('louischatriot+t@gmail.com'.match(re));
      assert.isNull('louischatriot+tldr@gmail.com'.match(re));
      assert.isNull('louis.chatrot@gmail.com'.match(re));
      assert.isNull('louis.chatrot+tldr@gmail.com'.match(re));
      assert.isNull('louis.chatriot+@gmail.com'.match(re));

      assert.isNotNull('louis.chatriot@gmail.com'.match(re));
      assert.isNotNull('louis.chatriot+t@gmail.com'.match(re));
      assert.isNotNull('louis.chatriot+tldr@gmail.com'.match(re));
    });

    it('Given a non Gmail address, should only match this address', function () {
      var add = "louis.chatriot@yahoo.com"
        , re = customUtils.getSubAdressedGmails(add)
        ;

      assert.isNull('louischatriot@yahoo.com'.match(re));
      assert.isNull('louischatriot+t@yahoo.com'.match(re));
      assert.isNull('louischatriot+tldr@yahoo.com'.match(re));
      assert.isNull('louis.chatrot@yahoo.com'.match(re));
      assert.isNull('louis.chatrot+tldr@yahoo.com'.match(re));
      assert.isNull('louis.chatriot+@yahoo.com'.match(re));
      assert.isNull('louis.chatriot+t@yahoo.com'.match(re));
      assert.isNull('louis.chatriot+tldr@yahoo.com'.match(re));

      assert.isNotNull('louis.chatriot@yahoo.com'.match(re));
    });

  });   // ==== End of '#getSubAdressedGmails' ==== //


});

