echo "TLDR - Launching tests. Setting environment to test"
export TLDR_ENV="test"
make test
echo "Tests finished, setting evironment back to development"
export TLDR_ENV="development"
