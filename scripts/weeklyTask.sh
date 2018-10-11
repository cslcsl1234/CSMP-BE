echo " --------------------- begin ---------------------------------"
TODAY_DD=`date +%Y-%m-%d`
YESTODAY_DD=`date -d yesterday +%Y-%m-%d`


authkey=`curl --silent -X POST http://csmpserver:8080/api/login -d "username=admin&password=password" | jq -r -S '.authKey'`
echo "authkey="$authkey
  
curl --silent -H "Authorization: ${authkey}" -X GET "http://csmpserver:8080/api/event/array/resource?from=${YESTODAY_DD}&to=${TODAY_DD}"

echo " --------------------- end ---------------------------------"
