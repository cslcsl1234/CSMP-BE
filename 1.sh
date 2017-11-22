


mongodb_repo=/etc/yum.repos.d/mongodb.repo

echo "[mongodb] " >  ${mongodb_repo}
echo "name=MongoDB Repository " >> ${mongodb_repo}
echo "baseurl=http://downloads-distro.mongodb.org/repo/redhat/os/x86_64/ " >> ${mongodb_repo}
echo "gpgcheck=0 " >> ${mongodb_repo}
echo "enabled=1 " >> ${mongodb_repo}
echo "" >> ${mongodb_repo}



