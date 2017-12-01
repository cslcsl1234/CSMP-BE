mongoimport -d csmp -c roles --drop roles.dat


customerdata=../customerdata/$1
 
mongoimport -d csmp -c datacenters  --drop ${customerdata}/datacenters.dat
mongoimport -d csmp -c hosts  --drop ${customerdata}/hosts.dat
mongoimport -d csmp -c applications  --drop ${customerdata}/applications.dat
mongoimport -d csmp -c arrays  --drop ${customerdata}/arrays.dat
mongoimport -d csmp -c switchs  --drop ${customerdata}/switchs.dat
mongoimport -d csmp -c switchs  --drop ${customerdata}/switchs.dat
mongoimport -d csmp -c auths  --drop ${customerdata}/auths.dat
