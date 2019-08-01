#!/bin/bash

if [ -z "$1" ]
  then
    echo "Usage: $0 <customername>";
    exit;
fi

customerdata=../CustomerData/$1

mkdir -p ${customerdata} 

DB=csmp
COLLECTIONS=$(mongo localhost:27017/$DB --quiet --eval "db.getCollectionNames()" | sed 's/,/ /g')

for collection in $COLLECTIONS; do
    echo "Exporting $DB/$collection ..."
    mongoexport -d ${DB} -c $collection -o ${customerdata}/$collection.json
done

