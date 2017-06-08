
. /etc/profile
cp /tmp/config.json ./config/.

nohup node app.js > stdout.log 2> stderr.log &

