#!/usr/bin/bash

rm -f cache/*
node lsremote.js &

PID=$!

sleep 2

sh test/test.sh

RESULT=$?

kill $PID

exit $RESULT

