#!/usr/local/bin/expect -f
#
#

echo " --------------------- begin ---------------------------------"
end=`date +%Y%m%d`
begin=`date -d "7 days ago" +%Y%m%d`
now=`date +%Y%m%d%H%M%S`


reportfile=/csmp/reporting/DISK_IO_Report_${end}.xlsx
reportfilename=`basename ${reportfile}`


echo "${now} Begin execute weekly report from ${begin} to ${end} "
echo "OutPutFile: ${reportfile}"

authkey=`curl --silent -X POST http://csmpserver:8080/api/login -d "username=admin&password=password" | jq -r -S '.authKey'`
echo "authkey="$authkey


echo "curl --silent -X GET http://csmpserver:8080/api/reports/weeklyreport/performance/applications?from=${begin}&to=${end} -H "Authorization: ${authkey}""
curl --silent -X GET "http://csmpserver:8080/api/reports/weeklyreport/performance/applications?from=${begin}&to=${end}" -H "Authorization: ${authkey}"

sleep 900

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

echo "upload  ${reportfile} to External System"
export SSHPASS=Ve@ms_a185
/usr/local/bin/expect -c "
spawn sftp -oPort=16022 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null vemsftp@10.1.32.82
expect \"Password:\"
send \"Ve@ms_a185\r\"
expect \"sftp>\"
send \"cd /vemsftp/ftpdatas/storage\r\"
expect \"sftp>\"
send \"put ${reportfilename}\r\"
expect \"sftp>\"
send \"exit\r\"
"
fi

now=`date +%Y%m%d%H%M%S`
echo "${now} end execute weekly report from ${begin} to ${end} "
echo " --------------------- end ---------------------------------"
