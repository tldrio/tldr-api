test:
	@echo "TLDR - Launching tests. Setting environment to test"
	@ TLDR_ENV="test" ./node_modules/.bin/mocha --reporter spec 
	@echo "Tests finished, setting environment back to development"

testRemote:
	@echo "TLDR - Launching tests on remote server. Setting environment to test"
	@ TLDR_ENV="remote" ./node_modules/.bin/mocha --reporter spec
	@echo "Tests finished, setting environment back to development"

testPretty:
	@echo "TLDR - Launching tests. Setting environment to test"
	@ TLDR_ENV="test" ./node_modules/.bin/mocha --reporter spec | ./node_modules/.bin/bunyan -o simple
	@echo "Tests finished, setting environment back to development"

testSlow:
	@echo "TLDR - Launching tests. Setting environment to test"
	@ TLDR_ENV="test" ./node_modules/.bin/mocha --reporter spec --timeout 10000
	@echo "Tests finished, setting environment back to development"

test-jenkins:
	@echo "TLDR - Launching tests. Setting environmentment to test"
	@ TLDR_ENV="test" ./node_modules/.bin/mocha -R tap
	@echo "Tests finished, setting environment back to development"

.PHONY: test

