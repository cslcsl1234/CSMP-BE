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

ftp -n 10.1.41.60 <<!
user cmdbef cmdbef1234
cd /attachment/cz/
lcd /csmp/reporting/resource
bin 
get ${CMDBFILE}
exit
!

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
ftp -n 10.1.41.60 <<!
user cmdbsb cmdbsb@1234
bin 
put topology${DD}.xlsx
exit
!
fi

if [ -f lunmapping.xlsx ];
then 
	echo "mv lunmapping.xlsx lunmapping${DD}.xlsx"
	mv lunmapping.xlsx lunmapping${DD}.xlsx
ftp -n 10.1.41.60 <<!
user cmdbsb cmdbsb@1234
bin 
put lunmapping${DD}.xlsx
exit
!
fi

echo 'curl --silent -X GET http://csmpserver:8080/api/external/switchinfo -H "Authorization: ${authkey}"'
curl --silent -X GET http://csmpserver:8080/api/external/switchinfo -H "Authorization: ${authkey}"
if [ -f switchinfo${DD1}.csv ];
then 
	echo "put file switchinfo${DD1}.csv"
ftp -n 10.1.41.60 <<!
user cmdbsb cmdbsb@1234
bin 
put switchinfo${DD1}.csv
exit
!
fi

echo 'curl --silent -X GET http://csmpserver:8080/api/external/arrayinfo -H "Authorization: ${authkey}"'
curl --silent -X GET http://csmpserver:8080/api/external/arrayinfo -H "Authorization: ${authkey}"
if [ -f switchinfo${DD1}.csv ];
then 
	echo "put file arrayinfo${DD1}.csv"
ftp -n 10.1.41.60 <<!
user cmdbsb cmdbsb@1234
bin 
put arrayinfo${DD1}.csv
exit
!
fi


echo " --------------------- end ---------------------------------"
