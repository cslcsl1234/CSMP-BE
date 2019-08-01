#!/usr/local/bin/expect -f
#
# the privide the topo data to CMDB For AirChina 
#

echo " --------------------- begin ---------------------------------"
DD=`date +%Y%m%d%H%M%S`
DD1=`date +%Y-%m-%d`
YESTODAY_DD=`date -d yesterday +%Y%m%d`

authkey=`curl --silent -X POST http://csmpserver:8080/api/login -d "username=admin&password=password" | jq -r -S '.authKey'`

echo "authkey="$authkey


CMDBFILE=CMDBTOSTORAGE${YESTODAY_DD}.csv
 
/usr/local/bin/expect -c "
spawn sftp -oPort=16022 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null cmdbef@10.1.41.60
expect \"Password:\"
send \"ITSM_cmdbef#04\r\"
expect \"sftp>\"
send \"cd /export/home/eoms4ftp/cmdbef/attachment/cz\r\"
expect \"sftp>\"
send \"get /export/home/eoms4ftp/cmdbef/attachment/cz/${CMDBFILE} /csmp/reporting/resource/\r\"
expect \"sftp>\"
send \"exit\r\"
"
cd /csmp/reporting/resource 
if [ -f ${CMDBFILE} ];
then 
	echo "file is exist"
	cp CMDBTOSTORAGE${YESTODAY_DD}.csv CMDBTOSTORAGE.csv
else 
	echo "file is not exist"
	exit;
fi


echo 'curl --silent -X GET http://csmpserver:8080/api/topology/app -H "Authorization: ${authkey}"'
curl --silent -X GET http://csmpserver:8080/api/topology/app -H "Authorization: ${authkey}"

cd /csmp/reporting
if [ -f topology.xlsx ];
then 
	echo "mv topology.xlsx topology${DD}.xlsx"
	mv topology.xlsx topology${DD}.xlsx
/usr/local/bin/expect -c "
spawn sftp -oPort=16022 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null cmdbsb@10.1.41.60
expect \"Password:\"
send \"ITSM_sb#04\r\"
expect \"sftp>\"
send \"put topology${DD}.xlsx\r\"
expect \"sftp>\"
send \"exit\r\"
fi

if [ -f lunmapping.xlsx ];
then 
	echo "mv lunmapping.xlsx lunmapping${DD}.xlsx"
	mv lunmapping.xlsx lunmapping${DD}.xlsx
#spawn sftp -oPort=16022 cmdbsb@10.1.41.60
#expect {
#"Password:" {send "ITSM_sb#04\r";exp_continue}
#}
#bin 
#put lunmapping${DD}.xlsx
#exit
#!
/usr/local/bin/expect -c "
spawn sftp -oPort=16022 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null cmdbsb@10.1.41.60
expect \"Password:\"
send \"ITSM_sb#04\r\"
expect \"sftp>\"
send \"put lunmapping${DD}.xlsx\r\"
expect \"sftp>\"
send \"exit\r\"
fi

echo 'curl --silent -X GET http://csmpserver:8080/api/external/switchinfo -H "Authorization: ${authkey}"'
curl --silent -X GET http://csmpserver:8080/api/external/switchinfo -H "Authorization: ${authkey}"
if [ -f switchinfo${DD1}.csv ];
then 
	echo "put file switch_info${DD1}.csv"
/usr/local/bin/expect -c "
spawn sftp -oPort=16022 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null cmdbsb@10.1.41.60
expect \"Password:\"
send \"ITSM_sb#04\r\"
expect \"sftp>\"
send \"put witch_info${DD1}.csv\r\"
expect \"sftp>\"
send \"exit\r\"
"
fi

echo 'curl --silent -X GET http://csmpserver:8080/api/external/arrayinfo -H "Authorization: ${authkey}"'
curl --silent -X GET http://csmpserver:8080/api/external/arrayinfo -H "Authorization: ${authkey}"
if [ -f switchinfo${DD1}.csv ];
then 
	echo "put file array_info${DD1}.csv"
/usr/local/bin/expect -c "
spawn sftp -oPort=16022 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null cmdbsb@10.1.41.60
expect \"Password:\"
send \"ITSM_sb#04\r\"
expect \"sftp>\"
send \"put array_info${DD1}.csv\r\"
expect \"sftp>\"
send \"exit\r\"
"
fi


echo " --------------------- end ---------------------------------"
