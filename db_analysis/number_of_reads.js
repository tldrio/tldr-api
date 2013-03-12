#!/bin/bash

echo "====================="
date
redis-cli -n 0 get global:totalTldrReadCount
