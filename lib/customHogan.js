var hogan = require('hogan.js')
  , fs = require('fs')
  , cache = {}
  , _ = require('underscore')
  , async = require('async')
  , compiledTemplates = {}
  , templatesDir = 'templates/';   // All templates are in this directory, we put the name here so as not to write it everywhere


// Compile all mustache templates in templatesDir/root and put the result in compiledTemplates
function readAndCompileTemplates (root, callback) {
  var files = [], dirs = [];

  fs.readdir(templatesDir + root, function (err, dirContents) {
    if (err) { return; }   // If we can't read the directory, it may mean it is in fact a file not ending with
                           // .mustache and thus mistaken for a directory in a lower recursion level

    // Once directory has been
    _.each(dirContents, function (item) {
      if (item.match(/\.mustache$/)) {
        files.push(root + item);
      } else {
        dirs.push(root + item);
      }
    });

    // Compile all templates in this level of the file system, then call readAndCompileTemplates on the deeper directories
    var i = 0;
    async.whilst(
      function () { return i < files.length; }
    , function (cb) {
        fs.readFile(templatesDir + files[i], 'utf8', function (err, str) {
          i += 1;   // Increment i here so that there is a read error, we can simply move on to the next file and ignore the problematic one

          if (err) { return cb(); }

          compiledTemplates[files[i - 1]] = str;
          cb();
        });
      }
    , function () {
        // Now compile all templates in sub levels of the file system found in the 'fs.readDir' above
        var i = 0;
        async.whilst(
          function () { return i < dirs.length; }
        , function (cb) {
            readAndCompileTemplates(dirs[i] + '/', function () {
              i += 1;
              cb();
            });
          }
        , callback
        );
      }
    );
  });
}

readAndCompileTemplates('website/', function () {
  console.log("=============");
  console.log(_.keys(compiledTemplates));

});



function read(path, options, fn) {
  var str = cache[path];

  // cached
  if (options.cache && str) return fn(null, str);

  // read
  fs.readFile(path, 'utf8', function(err, str){
    if (err) return fn(err);
    if (options.cache) cache[path] = str;
    fn(null, str);
  });
}


module.exports = function(path, options, fn) {
  var indd = hogan.compile('EEEEEEEEEEEEEEEEEEE');

  read(path, options, function(err, str) {
    if (err) return fn(err);
    try {
      var tmpl = hogan.compile(str, options);
      fn(null, tmpl.render(options, { bloup: '{{>index}}', index: indd }));
    } catch (err) {
      fn(err);
    }
  });
};
