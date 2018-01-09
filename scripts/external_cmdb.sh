
DD=`date +%Y%m%d%H%M%S`

SERVERIP=192.168.182.20
OUTFILE=/tmp/cmdb.json.${DD}

authkey=`curl --silent -X POST  http://${SERVERIP}:8080/api/login -d "username=admin&password=password"  | jq -r -S '.authKey'`

curl --silent -X GET http://${SERVERIP}:8080/api/external/cmdb -H "Authorization: ${authkey}"  > ${OUTFILE}
