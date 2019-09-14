
. /etc/profile
#cp /tmp/config.json ./config/.

cd /csmp/CSMP-BE

if ps -ef|grep node|grep app.js|grep -v grep 
then
	echo "node process is exist!"
else
	echo "node process is not exists!"
	nohup node --max-old-space-size=6199 app.js > stdout.log 2> stderr.log &
fi

cd /csmp/ssmp-backend

if ps -ef|grep node|grep script.js|grep -v grep
then
        echo "node script process is exist!"
else
        echo "node script process is not exists!"
        nohup node script.js > stdout.log 2> stderr.log &
fi



