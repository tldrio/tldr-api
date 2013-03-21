#!/usr/bin/env node

var _ = require('underscore')
  , async = require('async')
  , juice = require('juice')
  , program = require('commander')
  , fs = require('fs')
  , result
  , template
  , css;



program
  .version('1.0.0')
  .option('-c, --css [file]', 'css file to inline')
  .option('-t, --template [file]', 'template to process')
  .option('-o, --output [file]', 'Output')
  .parse(process.argv);


console.log('Program will inline');
if (program.css) {
  console.log(program.css + ' css file ');
}
else {
  console.log('No css file provided it\'s bad');
  process.exit(0);
}
if (program.template) {
  console.log('in',program.template,  'template');
}
else {
  console.log('No template file provided it\'s bad');
  process.exit(0);
}
if (program.output) console.log('and output in',program.output);

template = fs.readFileSync(program.template, 'utf8');
css = fs.readFileSync(program.css, 'utf8');
result = juice.inlineContent(template, css);

if (program.output) {
  fs.writeFileSync(program.output, result)
}

console.log('TEMAPLTE', template);
console.log('CSS', css);
console.log('RESULT', result);
process.exit(0);
