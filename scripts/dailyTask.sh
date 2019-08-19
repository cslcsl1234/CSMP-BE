echo " --------------------- begin ---------------------------------"
TODAY_DD=`date +%Y-%m-%d`
YESTODAY_DD=`date -d yesterday +%Y-%m-%d`

cp /csmp/CSMP-BE/data/mgmtobjects_status.json /csmp/CSMP-BE/data/mgmtobjects_status.json.${YESTODAY_DD}

authkey=`curl --silent -X POST http://csmpserver:8080/api/login -d "username=admin&password=password" | jq -r -S '.authKey'`
echo "authkey="$authkey


curl --silent -X GET http://csmpserver:8080/api/backendmgmt/monitoring/serverstatus?execute=true -H "Authorization: ${authkey}"

curl --silent -X GET http://csmpserver:8080/api/backendmgmt/monitoring/testvaild -H "Authorization: ${authkey}"
curl --silent -X GET http://csmpserver:8080/api/backendmgmt/monitoring/mgmtobjects?execute=true -H "Authorization: ${authkey}"

echo " === Host IOLimit Exceeded statistics each day into mongodb(iolimitevents) from ${YESTODAY_DD} to ${TODAY_DD} === "
curl --silent -H "Authorization: ${authkey}" -X GET "http://csmpserver:8080/api/event/performance/sg/iolimit?from=${YESTODAY_DD}&to=${TODAY_DD}"
 

echo " --------------------- end ---------------------------------"
