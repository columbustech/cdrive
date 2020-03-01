# Cluster Setup

CDrive has been tested on Kubernetes clusters hosted on AWS. We use [Kops](https://github.com/kubernetes/kops) for 
installation, upgrades and management of Kubernetes clusters.

## Install AWS CLI, Kops, Kubernetes CLI and Helm

[AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html)
[Kops](https://github.com/kubernetes/kops/blob/master/docs/install.md)
[Kubernetes CLI](https://kubernetes.io/docs/tasks/tools/install-kubectl/)
[Helm](https://helm.sh/docs/intro/install/)

## Create an IAM user for Kops

The IAM user will require the following IAM permissions to function properly

```
AmazonEC2FullAccess
AmazonRoute53FullAccess
AmazonS3FullAccess
IAMFullAccess
AmazonVPCFullAccess
```

You can create this IAM user from the aws console or from the command line. On creating a user, you get an AWS access
key id and an AWS secret access key id.

```bash
aws configure
export AWS_ACCESS_KEY_ID=$(aws configure get aws_access_key_id)
export AWS_SECRET_ACCESS_KEY=$(aws configure get aws_secret_access_key)
```

## Create an S3 bucket for storing cluster state

```
aws s3api create-bucket --bucket prefix-example-com-state-store --region us-east-1
export KOPS_STATE_STORE=prefix-example-com-state-store
```

## Register a domain on AWS

Go to AWS Route53 and register a domain. For the purpose of this guide, let's call it example.com.

## Key for accessing nodes

Create a public-private key pair for accessing the cluster master and nodes:

```
ssh-keygen
```

## Start Cluster

Specify cluster name, zone, node size, number of nodes and start the cluster. Look up Kops CLI for further 
configuration options.

```
export KOPS_CLUSTER_NAME=firstcluster.example.com
kops create cluster --zones=us-east-1a --node-count=3 --node-size=m4.large --name=${KOPS_CLUSTER_NAME}
kops create secret --name ${KOPS_CLUSTER_NAME} sshpublickey admin -i ~/.ssh/id_rsa.pub
kops update cluster --name ${KOPS_CLUSTER_NAME} --yes
```

## Validate Cluster

Validate the cluster with the following command. It may take a few minutes for the cluster to be created.

```
kops validate cluster
```
