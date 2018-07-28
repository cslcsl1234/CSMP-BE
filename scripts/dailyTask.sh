echo " --------------------- begin ---------------------------------"
DD=`date +%Y%m%d%H%M%S`
YESTODAY_DD=`date -d yesterday +%Y%m%d`

authkey=`curl --silent -X POST http://csmpserver:8080/api/login -d "username=admin&password=password" | jq -r -S '.authKey'`
sleep 5
authkey=`curl --silent -X POST http://csmpserver:8080/api/login -d "username=admin&password=password" | jq -r -S '.authKey'`

echo "authkey="$authkey


curl --silent -X GET http://csmpserver:8080/api/backendmgmt/monitoring/serverstatus?execute=true -H "Authorization: ${authkey}"

curl --silent -X GET http://csmpserver:8080/api/backendmgmt/monitoring/testvaild -H "Authorization: ${authkey}"
curl --silent -X GET http://csmpserver:8080/api/backendmgmt/monitoring/mgmtobjects?execute=true -H "Authorization: ${authkey}"


echo " --------------------- end ---------------------------------"
