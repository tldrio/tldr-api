test:
	@echo "TLDR - Launching tests. Setting environment to test"
	@ TLDR_ENV="test" ./node_modules/.bin/mocha --reporter list | ./node_modules/.bin/bunyan -o simple
	@echo "Tests finished, setting evironment back to development"

test_remote:
	@echo "TLDR - Launching tests on remote server. Setting environment to test"
	@ TLDR_ENV="remote" ./node_modules/.bin/mocha --reporter spec 
	@echo "Tests finished, setting evironment back to development"

.PHONY: test

