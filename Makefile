test:
	@echo "TLDR - Launching tests. Setting environment to test"
	@ NODE_ENV="test" ./node_modules/.bin/mocha --reporter spec
	@echo "Tests finished, setting environment back to development"

testPretty:
	@echo "TLDR - Launching tests. Setting environment to test"
	@ NODE_ENV="test" ./node_modules/.bin/mocha --reporter spec | ./node_modules/.bin/bunyan -o simple
	@echo "Tests finished, setting environment back to development"

testSlow:
	@echo "TLDR - Launching tests. Setting environment to test"
	@ NODE_ENV="test" ./node_modules/.bin/mocha --reporter spec --timeout 10000
	@echo "Tests finished, setting environment back to development"

test-jenkins:
	@echo "TLDR - Launching tests. Setting environmentment to test"
	@ NODE_ENV="test" ./node_modules/.bin/mocha -R tap
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

