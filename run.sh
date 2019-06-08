
. /etc/profile
#cp /tmp/config.json ./config/.

cd /csmp/CSMP-BE

if ps -ef|grep node|grep app.js|grep -v grep 
then
	echo "node process is exist!"
else
	echo "node process is not exists!"
	nohup node --max-old-space-size=4096 app.js > stdout.log 2> stderr.log &
fi



