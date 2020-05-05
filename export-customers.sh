#!/bin/bash
dbserver=csmpdbserver

if [ -z "$1" ]
  then
    echo "Usage: $0 <customername>";
    exit;
fi

customerdata=../CustomerData/$1

mkdir -p ${customerdata} 

DB=csmp
COLLECTIONS=$(mongo ${dbserver}:27017/$DB --quiet --eval "db.getCollectionNames()" | sed 's/,/ /g'|sed 's/\[//g'|sed 's/\]//g'|sed 's/"//g')

for collection in $COLLECTIONS; do
    echo "Exporting $DB/$collection ..."
    mongoexport --host ${dbserver} -d ${DB} -c $collection -o ${customerdata}/$collection.json
done

# mongodump -h dbhost -d dbname -o <dbdirectory>
# mongorestore -h <hostname><:port> -d dbname <dbdirectory>
