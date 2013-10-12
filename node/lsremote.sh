#!/bin/bash
#
# Startup script for the LSremote server
#
PORT=8006
APP=/var/www/lsremote/node/lsremote.js
NODE=/usr/bin/nodejs
LOG=/var/log/lsremote

mkdir -p $LOG

case $1 in
        start)
                sudo -u www-data $NODE $MEMORY $APP $PORT -id 1 >> $LOG/lsremote.log 2>&1 &
        ;;
        stop)
                pid=`pgrep -f "$NODE $MEMORY $APP $PORT -id 1"`
                sudo kill -9 $pid
        ;;
        restart)
                pid=`pgrep -f "$NODE $MEMORY $APP $PORT -id 1"`
                sudo kill -9 $pid
                /etc/init.d/lsremote
        ;;
        *)
                echo "Usage: /etc/init.d/lsremote start|stop|restart"
        ;;
esac

exit 0