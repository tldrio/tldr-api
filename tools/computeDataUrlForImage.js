var fs = require('fs')
  , program = require('commander')
  , clipboard = require("copy-paste").noConflict();

program
  .version('1.0.0')
  .usage('Will give the base64 representation of the image')
  .option('-f, --file [file]', 'image to convert')
  .parse(process.argv);

var img = fs.readFileSync(program.file, 'base64')
  , url = 'data:image/png;base64,' + img;

clipboard.copy(url);
