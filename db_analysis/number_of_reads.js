#!/bin/bash

echo "====================="
date
redis-cli get global:totalTldrReadCount
