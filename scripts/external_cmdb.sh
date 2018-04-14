#
# the privide the topo data to CMDB For AirChina 
#

DD=`date +%Y%m%d%H%M%S`
OUTPATH=/home/ftpuser
OUTFILE=${OUTPATH}/cmdb/cmdb.json
TMPFILE=${OUTPATH}/tmp/cmdb.json

authkey=`curl --silent -X POST http://10.2.2.105:8080/api/login -d "username=admin&password=password" | jq -r -S '.authKey'`
sleep 5
authkey=`curl --silent -X POST http://10.2.2.105:8080/api/login -d "username=admin&password=password" | jq -r -S '.authKey'`
echo $authkey

curl --silent -X GET http://10.2.2.105:8080/api/external/cmdb -H "Authorization: ${authkey}" > ${TMPFILE}.${DD}

cp ${TMPFILE}.${DD} ${OUTFILE}


sftp ftpuser@10.9.214.104 <<!
cd /arsys/interface/storagewwpn
bin
put /home/ftpuser/cmdb/cmdb.json
exit
!

sftp ftpuser@10.9.214.105 <<!
cd /arsys/interface/storagewwpn
bin
put /home/ftpuser/cmdb/cmdb.json
exit
!
