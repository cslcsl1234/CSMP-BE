#!/bin/bash

vplexip=10.32.32.100
username=service
password=password

curl -k -H "username:${username}" -H "password:${password}" https://${vplexip}/vplex/clusters/cluster-1/exports/storage-views/*  > cluster-1_storage-views.json
curl -k -H "username:${username}" -H "password:${password}" https://${vplexip}/vplex/clusters/cluster-2/exports/storage-views/*  > cluster-2_storage-views.json
curl -k -H "username:${username}" -H "password:${password}" https://${vplexip}/vplex/clusters/cluster-1/consistency-groups/* > cluster-1_consistency-groups.json
curl -k -H "username:${username}" -H "password:${password}" https://${vplexip}/vplex/clusters/cluster-2/consistency-groups/* > cluster-2_consistency-groups.json
curl -k -H "username:${username}" -H "password:${password}" https://${vplexip}/vplex/clusters/cluster-1/storage-elements/storage-volumes/* > cluster-1_storage-volumes.json
curl -k -H "username:${username}" -H "password:${password}" https://${vplexip}/vplex/clusters/cluster-2/storage-elements/storage-volumes/* > cluster-2_storage-volumes.json
