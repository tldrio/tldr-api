#!/usr/bin/env node

var request = require('request')
  , program = require('commander')
  , h4e = require('h4e')
  , fs = require('fs')
  , result
  , clipboard = require("copy-paste").noConflict()
  ;

h4e.setup({ extension: 'mustache'
          , baseDir: process.env.TLDR_API_DIR + '/templates'
          });



program
  .version('1.0.0')
  .usage('Will fetch the tldr specified by the parameter id, render with the tldrEmbed template and copy the result in the clipboard!')
  .option('-i, --tldrId [id]', 'id of tldr to process')
  .parse(process.argv);


if (!program.tldrId) {
  console.log('No tldrid provided it\'s bad');
  process.exit(1);
}


request.get({ headers: {"Accept": "application/json"}, uri: 'http://tldr.io/tldrs/' + program.tldrId}, function (err, res, body) {
  var tldr = JSON.parse(res.body);
  if (res.statusCode !== 200) {
    console.log('Error while fetching the tldr. Return code is ', res.statusCode);
    process.exit(1);
  }
  //console.log('Tldr of', tldr.title, 'fetched');
  //console.log(tldr);
  result = h4e.render('emails/tldrEmbed', { values: { tldr: tldr, creator: tldr.creator } });
  //console.log('Result')
  //console.log('========')
  //console.log(result);
  //console.log('========')
  clipboard.copy(result);
});

