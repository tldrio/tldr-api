var hogan = require('hogan.js')
  , fs = require('fs')
  , path = require('path')
  , _ = require('underscore')
  , async = require('async')
  , compiledTemplates
  , extension = '.mustache'      // Only files with this extension will be compiled
  , templatesDir, targets
  ;


/**
 * Compile all templates in templatesDir/root and put the result in compiledTemplates
 * Used only once at the first rendering, then all compiled templates will be cached for more efficiency
 * @param {String} root directory from which to recursively compile all templates
 * @param {Function} callback to be called after execution. Will be called even if there is an error, since that only means some files were not processed
 */
function readAndCompileTemplates (root, callback) {
  var dir = path.resolve(templatesDir, root);

  console.log("RACT called");

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


/**
 * Actually render the template. The signature is imposed by Express
 * @param {String} template Path to reach the template from the baseDir
 * @param {Object} options Hogan options. The two most important are options.values and options.partials (names are explicit)
 * @param {Function} fn Callback supplied by Express once rendering is done
 */
function render (template, options, fn) {
  if (compiledTemplates) {
    renderInternal(template, options, fn);
  } else {
    compiledTemplates = {};
    readAndCompileTemplates('website', function () {
      renderInternal(template, options, fn);
    });
  }

  // Actually renders the templates
  function renderInternal (template, options, fn) {
    var extname = path.extname(template)
      , basename = path.basename(template, extname)
      , relative = path.relative(templatesDir, template)
      , dirname = path.dirname(relative)
      , keyname = path.join(dirname, basename)
        // A bit complicated, but we have to do it this way to comply with Express' signature
      , templateToRender = compiledTemplates[keyname]
      ;

    try {
      // If compiledTemplates and options.partials have keys in common, compiledTemplates' will be rewritten
      // which is the intended behaviour because we can override it when we want
      fn(null, templateToRender.render(options.values, _.extend(compiledTemplates, options.partials)));
    } catch (err) {
      fn(err);
    }
  }
}


/**
 * Compiles the templates and returns the render function to be used by Express
 * @param {String} baseDir The base directory where all templates are, not to be repeated in all partials names
 * @param {Array} toCompileDirs All subdirs containing the templates, part of the partials names
 */
module.exports = function (baseDir, toCompileDirs) {
  templatesDir = baseDir;
  targets = toCompileDirs;

  return render;
}


// Exports
//module.exports.readAndCompileTemplates = readAndCompileTemplates;
//module.exports.render = render;
