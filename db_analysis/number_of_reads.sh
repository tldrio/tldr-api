#!/bin/bash

echo "====================="
date
/usr/local/bin/redis-cli -n 0 get global:totalTldrReadCount
