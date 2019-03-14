#
#

echo " --------------------- begin ---------------------------------"
end=`date +%Y%m%d`
begin=`date -d "7 days ago" +%Y%m%d`
now=`date +%Y%m%d%H%M%S`


reportfile=/csmp/reporting/WeeklyReport_${begin}-${end}.xlsx
reportfilename=`basename ${reportfile}`


echo "${now} Begin execute weekly report from ${begin} to ${end} "
echo "OutPutFile: ${reportfile}"

authkey=`curl --silent -X POST http://csmpserver:8080/api/login -d "username=admin&password=password" | jq -r -S '.authKey'`
echo "authkey="$authkey


echo "curl --silent -X GET http://csmpserver:8080/api/reports/weeklyreport/performance/applications?from=${begin}&to=${end} -H "Authorization: ${authkey}""
curl --silent -X GET "http://csmpserver:8080/api/reports/weeklyreport/performance/applications?from=${begin}&to=${end}" -H "Authorization: ${authkey}"

cd /csmp/reporting

if [ -f ${reportfile} ];
then 

echo "upload  ${reportfile}"
ftp -n 10.1.28.199 <<!
user other Oct@2018
bin 
cd /lsp/sa/other/StorageWeeklyReport
put ${reportfilename}
exit
!


fi

