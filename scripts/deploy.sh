#!/bin/bash

apt-get update -y && apt-get install curl
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
./aws/install


curl -Lo kops https://github.com/kubernetes/kops/releases/download/$(curl -s https://api.github.com/repos/kubernetes/kops/releases/latest | grep tag_name | cut -d '"' -f 4)/kops-linux-amd64
chmod +x ./kops
mv ./kops /usr/local/bin/


curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl


wget https://get.helm.sh/helm-v3.6.0-linux-amd64.tar.gz
tar -zxvf helm-v3.0.0-linux-amd64.tar.gz
mv linux-amd64/helm /usr/local/bin/helm

echo "AWS_ACCESS_KEY_ID: "
read AWS_ACCESS_KEY_ID
echo "AWS_SECRET_ACCESS_KEY: "
read AWS_SECRET_ACCESS_KEY

echo "These are the domains that are registered in your AWS account: "
aws route53 list-hosted-zones --query 'HostedZones[*].Name'
echo "Enter the domain where you would like to host CDrive (This can also be a subdomain of one of the registered domains, for example if you have registered columbustech.io, you can enter dev1.columbustech.io):"
read CDRIVE_URL

echo "Number of master nodes:"
read N_MASTERS
echo "Number of worker nodes:"
read N_WORKERS
echo "AWS instance type of master nodes:"
read MASTER_TYPE
echo "AWS instance type of worker nodes:"
read WORKER_TYPE

ssh-keygen

KOPS_CLUSTER_NAME=cluster."($CDRIVE_URL)"
kops create cluster --zones=us-east-1a --node-count="($N_WORKERS)" --node-size="($WORKER_TYPE)" --name=${KOPS_CLUSTER_NAME}
kops create secret --name ${KOPS_CLUSTER_NAME} sshpublickey admin -i ~/.ssh/id_rsa.pub
kops update cluster --name ${KOPS_CLUSTER_NAME} --yes

git clone https://www.github.com/columbustech/cdrive.git

helm repo add jetstack https://charts.jetstack.io
helm repo update
helm install cert-manager --namespace cert-manager jetstack/cert-manager --version v0.14.0 \
--set ingressShim.defaultIssuerName=letsencrypt-prod \
--set ingressShim.defaultIssuerKind=ClusterIssuer

kubectl apply -f cdrive/scripts/cluster-issuer.yaml
helm repo add stable https://kubernetes-charts.storage.googleapis.com/
helm repo update
helm install nginx-ingress --namespace kube-system stable/nginx-ingress

kubectl apply -f cdrive
