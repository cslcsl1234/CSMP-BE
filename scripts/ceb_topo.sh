#
# the privide the topo data to CMDB For AirChina 
#

echo " --------------------- begin ---------------------------------"
DD=`date +%Y%m%d%H%M%S`
YESTODAY_DD=`date -d yesterday +%Y%m%d`

authkey=`curl --silent -X POST http://csmpserver:8080/api/login -d "username=admin&password=password" | jq -r -S '.authKey'`
sleep 5
authkey=`curl --silent -X POST http://csmpserver:8080/api/login -d "username=admin&password=password" | jq -r -S '.authKey'`
echo $authkey

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
fi


curl --silent -X GET http://csmpserver:8080/api/topology/app -H "Authorization: ${authkey}"

cd /csmp/reporting
if [ -f topology.xlsx ];
then 
	mv topology.xlsx topology${DD}.xlsx
fi

echo " --------------------- end ---------------------------------"
