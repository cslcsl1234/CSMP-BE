customerdata=../customerdata/$1

mkdir -p ${customerdata}

mongoexport -d csmp -c datacenters -o ${customerdata}/datacenters.dat
mongoexport -d csmp -c hosts -o ${customerdata}/hosts.dat
mongoexport -d csmp -c applications -o ${customerdata}/applications.dat
mongoexport -d csmp -c arrays -o ${customerdata}/arrays.dat
mongoexport -d csmp -c switchs -o ${customerdata}/switchs.dat
mongoexport -d csmp -c switchs -o ${customerdata}/switchs.dat
mongoexport -d csmp -c auths -o ${customerdata}/auths.dat
