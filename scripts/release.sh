releasefile=$1

cd /csmp
ps -ef|grep node|grep app.js|grep -v grep |awk '{print $2}' |xargs kill -9

rm -f -r CSMP-BE_old
mv CSMP-BE CSMP-BE_old

tar -zxvf /csmp/release/${releasefile}

echo "begin recover config.json file...";
cp /csmp/release/config.json /csmp/CSMP-BE/config/.

echo "begin start backend processing ...."
sh /csmp/CSMP-BE/run.sh

echo "---------------------------------"

ps -ef|grep node|grep app.js

