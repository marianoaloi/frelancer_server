#!/bin/bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

cd $SCRIPT_DIR

copy(){
        scp -r $SCRIPT_DIR/Dockerfile kube:"/data/freelancer-server/"
        scp -r $SCRIPT_DIR/package*.json kube:"/data/freelancer-server/"
        scp -r $SCRIPT_DIR/*.js kube:"/data/freelancer-server/"
        scp -r $SCRIPT_DIR/public kube:"/data/freelancer-server/"
        scp -r $SCRIPT_DIR/routes kube:"/data/freelancer-server/"
        scp -r $SCRIPT_DIR/views kube:"/data/freelancer-server/"
        scp -r $SCRIPT_DIR/*.yaml kube:"/data/freelancer-server/"

}

compile(){
        ssh kube 'mkdir -p /data/freelancer-server/'
        copy
        ssh kube 'cd /data/freelancer-server && sudo rm -rf node_modules '
        # ssh kube 'cd /data/freelancer-server && npm i deasync '
        ssh kube 'cd /data/freelancer-server && npm install --production '
        ssh kube 'cd /data/freelancer-server && docker build --pull --rm -f Dockerfile -t freelancer-server:latest . && docker tag freelancer-server localhost:5000/freelancer-server && docker push localhost:5000/freelancer-server'
        ssh kube 'kubectl delete secret -n freelancer-ns mongo-external-secret '
        ssh kube 'kubectl create secret generic -n freelancer-ns mongo-external-secret --from-literal=mongoexternal="'$MONGO_ARC'" --from-literal=free_pat="'$free_pat'"'
}
case $1 in
    compile)
        compile
       # ssh kube 'kubectl rollout restart deployment freelancer-server -n freelancer-ns'
        ssh kube 'kubectl apply -f /data/freelancer-server/freelancer.yaml'
        date +"%d-%m-%y %H:%M:%S"
    ;;
    copy)
        copy
        ssh kube 'kubectl rollout restart deployment freelancer-server -n freelancer-ns'
        date +"%d-%m-%y %H:%M:%S"
        git status
    ;;
    restart)
        ssh kube 'kubectl rollout restart deployment freelancer-server -n freelancer-ns'
        date +"%d-%m-%y %H:%M:%S"
    ;;
    batch)
       ssh kube "ID=$(docker ps |grep freelancer-servers |awk '{print $1}') && echo 'Found Container ID: ${ID}' &&docker exec -ti $ID  /bin/bash"
    ;;
    *)
        printf "Use: \n \t copy\n \t compile\n \t restart\n \t batch\n\n"
        ;;
esac