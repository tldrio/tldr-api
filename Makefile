test:
	@echo "TLDR - Launching tests. Setting environment to test"
	@ NODE_ENV="test" ./node_modules/.bin/mocha --reporter spec -t 10000
	@echo "Tests finished, setting environment back to development"

testMail:
	@echo "TLDR - Launching tests. Setting environment to test"
	@ NODE_ENV="testMail" ./node_modules/.bin/mocha --reporter spec -t 10000 test/mails.test.js
	@echo "Tests finished, setting environment back to development"

test-jenkins:
	@echo "TLDR - Launching tests. Setting environmentment to test"
	@ NODE_ENV="test" ./node_modules/.bin/mocha -R tap -t 10000
	@echo "Tests finished, setting environment back to development"

COVDIR=$(TLDR_API_DIR)/../api-cov
#Need to install jscoverage see details here https://github.com/visionmedia/node-jscoverage
test-cov:
	@echo "TLDR - Launching test coverage"
	@rm -rf $(COVDIR)
	@jscoverage . $(COVDIR) --exclude=test --exclude=node_modules --exclude=Makefile && \
	cp -R node_modules test $(COVDIR) && \
	cd $(COVDIR) && \
		 NODE_ENV="test" ./node_modules/.bin/mocha --reporter html-cov > test-coverage.html &&\
		open test-coverage.html &&\
	cd $(TLDR_API_DIR);
	@echo "Tests finished, setting environment back to development"

.PHONY: test

