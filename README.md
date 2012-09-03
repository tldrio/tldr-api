* `$ npm install` to install dependencies
* `$ node server.js` to run the server
* `$ make test` to run tests

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

