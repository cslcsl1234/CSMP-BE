ps -ef|grep node|grep app.js|grep -v grep|awk '{print $2}'|xargs kill -9

sleep 3

sh run.sh
