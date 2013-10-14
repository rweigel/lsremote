#!/usr/bin/bash

status=0
curl -g -s "http://localhost:8005/lsremote.js?recursive=true&dir=http://virbo.org/images/pngwalk/ACE/Multi/" | sort > test/tmp/test.0

a=`ls -l test/tmp/test.0 | cut -d' ' -f8`
b=`ls -l test/data/test.0 | cut -d' ' -f8`
echo $a $b
if [ "$a" != "$b" ]; then
	status=1
	echo "Test 0 failed"
fi

curl -g -s "http://localhost:8005/lsremote.js?recursive=true&dir=http://virbo.org/images/pngwalk/ACE/Multi/" | sort > test/tmp/test.1
a=`ls -l test/tmp/test.1 | cut -d' ' -f8`
b=`ls -l test/data/test.1 | cut -d' ' -f8`
echo $a $b
if [ "$a" != "$b" ]; then
	status=1
	echo "Test 1 failed"
fi

curl -g -s "http://localhost:8005/lsremote.js?recursive=false&dir=http://virbo.org/images/pngwalk/ACE/Multi/" | sort > test/tmp/test.2
a=`ls -l test/tmp/test.2 | cut -d' ' -f8`
b=`ls -l test/data/test.2 | cut -d' ' -f8`
echo $a $b
if [ "$a" != "$b" ]; then
	status=1
	echo "Test 2 failed"
fi

exit $status