npm install nodemon -g --registry=https://registry.npm.taobao.org
npm install grunt -g --registry=https://registry.npm.taobao.org


##----------------------
## install mongodb
##----------------------

mongodb_repo=/etc/yum.repos.d/mongodb.repo

echo "[mongodb] " >  ${mongodb_repo}
echo "name=MongoDB Repository " >> ${mongodb_repo}
echo "baseurl=http://downloads-distro.mongodb.org/repo/redhat/os/x86_64/ " >> ${mongodb_repo}
echo "gpgcheck=0 " >> ${mongodb_repo}
echo "enabled=1 " >> ${mongodb_repo}
echo "" >> ${mongodb_repo}


yum install mongo-10gen mongo-10gen-server -y

service mongod start


## ------------------------
##  Initial BackendServer Mongodb
## ------------------------
cd ~/CSMP-BE
grunt


npm install  --registry=https://registry.npm.taobao.org


