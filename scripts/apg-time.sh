#!/usr/local/bin/expect -f
#
#

end=`date +%Y%m%d`
begin=`date -d "7 days ago" +%Y%m%d`
now=`date +%Y%m%d%H%M%S` 

curl --silent -X GET http://csmpserver:9090/apginfo  


