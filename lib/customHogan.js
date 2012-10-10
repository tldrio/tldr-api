var hogan = require('hogan.js')
  , fs = require('fs')
  , path = require('path')
  , cache = {}
  , _ = require('underscore')
  , async = require('async')
  , config = require('./config')
  , compiledTemplates = {}
  , extension = '.mustache'               // This is the extension all templates need to share
  , templatesDir = config.templatesDir;   // All templates are in this directory, we put the name here so as not to write it everywhere




/**
 * Compile all templates in templatesDir/root and put the result in compiledTemplates
 * Used only once at the first rendering, then all compiled templates will be cached for more efficiency
 * @param {String} root directory from which to recursively compile all templates
 * @param {Function} callback to be called after execution. Will be called even if there is an error, since that only means some files were not processed
 */
function readAndCompileTemplates (root, callback) {
  var dir = path.resolve(templatesDir, root);

  fs.readdir(dir, function (err, files) {
    if (err) { return callback(err); }

    async.forEach(
        files
      , function (file, callback) {
          var extname = path.extname(file)
            , basename = path.basename(file, extname)
            , fullname = path.resolve(dir, file)
            ;

          fs.stat(fullname, function (err, stats) {
            if (err) { return callback(err); }
            if (stats.isDirectory()) {
              readAndCompileTemplates(path.join(root, basename), callback);
            }
            if (stats.isFile() && extname === '.mustache') {
              fs.readFile(fullname, 'utf8', function (err, str) {
                compiledTemplates[path.join(root, basename)] = hogan.compile(str);
                callback();
              });
            }
          });
        }
      , callback
      );

  });
}


// This function assumes all necessary templates have been compiled before being called
// That's why they are compiled in the server module, before even connecting to the db and launching the server
function render (template, options, fn) {
  var extname = path.extname(template)
    , basename = path.basename(template, extname)
    , relative = path.relative(templatesDir, template)
    , dirname = path.dirname(relative)
    , keyname = path.join(dirname, basename)
    ;
  // A bit complicated, but we have to do it this way to comply with Express' signature
  var templateToRender = compiledTemplates[keyname];

  try {
    // If compiledTemplates and options.partials have keys in common, compiledTemplates' will be rewritten
    // which is the intended behaviour because we can override it when we want
    fn(null, templateToRender.render(options.values, _.extend(compiledTemplates, options.partials)));
  } catch (err) {
    fn(err);
  }

}


// Exports
module.exports.readAndCompileTemplates = readAndCompileTemplates;
module.exports.render = render;
