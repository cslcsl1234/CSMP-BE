
dbserver=csmpserver
basepath=../CustomerData
customerdata=${basepath}/$1
 
mongoimport --host ${dbserver}  -d csmp -c menus --drop menus.dat
mongoimport --host ${dbserver}  -d csmp -c users --drop users.dat
mongoimport --host ${dbserver}  -d csmp -c roles --drop roles.dat

mongoimport --host ${dbserver}  -d csmp -c datacenters  --drop ${customerdata}/datacenters.dat
mongoimport --host ${dbserver}  -d csmp -c hosts  --drop ${customerdata}/hosts.dat
mongoimport --host ${dbserver}  -d csmp -c applications  --drop ${customerdata}/applications.dat
mongoimport --host ${dbserver}  -d csmp -c arrays  --drop ${customerdata}/arrays.dat
mongoimport --host ${dbserver}  -d csmp -c switchs  --drop ${customerdata}/switchs.dat
mongoimport --host ${dbserver}  -d csmp -c switchs  --drop ${customerdata}/switchs.dat
mongoimport --host ${dbserver}  -d csmp -c auths  --drop ${customerdata}/auths.dat
