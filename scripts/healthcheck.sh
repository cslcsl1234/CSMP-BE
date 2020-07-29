#!/usr/local/bin/expect -f
#
#
end=`date +%Y%m%d`
begin=`date -d "1 days ago" +%Y%m%d`
now=`date +%Y%m%d%H%M%S`
outputpath=/csmp/reporting

reportfilename=HealthCheck_VMAX_${begin}.xlsx
brocade_reportfilename=HealthCheck_Brocade_${begin}.xlsx
vnx_reportfilename=HealthCheck_VNX_${begin}.xlsx


echo " --------------------- begin ${reportfilename} ---------------------------------"
curl --silent -X GET "http://csmpserver:8080/healthcheck/vmax?begindate=${begin}"


echo " --------------------- begin ${brocade_reportfilename} ---------------------------------"
curl --silent -X GET "http://csmpserver:8080/healthcheck/brocade?begindate=${begin}"

echo " --------------------- begin ${vnx_reportfilename} ---------------------------------"
curl --silent -X GET "http://csmpserver:8080/healthcheck/vnx?begindate=${begin}"


sleep 600

/usr/local/bin/expect -c "
spawn sftp -oPort=26022 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null other@10.1.28.199
expect \"Password:\"
send \"Oct@2018\r\"
expect \"sftp>\"
send \"cd /lsp/sa/other/StorageHealthCheck\r\"
expect \"sftp>\"
send \"lcd /csmp/reporting\r\"
expect \"sftp>\"
send \"put ${reportfilename}\r\"
expect \"sftp>\"
send \"put ${brocade_reportfilename}\r\"
expect \"sftp>\"
send \"put ${vnx_reportfilename}\r\"
expect \"sftp>\"
send \"exit\r\"
"



echo " --------------------- end ---------------------------------"
