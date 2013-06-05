* `$ node server.js` to run the server
* `$ make test` to run tests

# Dependencies
We now use `npm shrinkwrap`. So no dependency is checked in to the repository (all of `node_modules` is in the 
`.gitignore`), and the package dependencies are locked in the file `npm-shrinkwrap.json`. When adding a dependency, follow
these steps:  

* Add the dependency to your `package.json`
* Run `npm install` to install this new dependency
* Delete the file `npm-shrinkwrap.json`
* Run the `npm shrinkwrap` command to recreate `npm-shrinkwrap.json`

If you are upgrading a dependency, follow the same steps but first delete the directory it is in.


# Dev Mode

* Use [node-supervisor](https://github.com/isaacs/node-supervisor/) to
live reload the server at each change (`supervisor server`); 
* Run `grunt lint` to lint the code and `grunt watch` to live execute
  lint task
* Set your `TLDR_PAGE_TEMPLATES` environment variable to your `[TLDR_CLIENTS]/dist/page/local/templates`

# Test Coverage

We use [jscoverage](http://siliconforks.com/jscoverage/) to run a test
coverage of our code. Check install of `jscoverage` for Node [here](http://siliconforks.com/jscoverage/).
`make test-cov` to run the test coverage (takes about 1 min).

