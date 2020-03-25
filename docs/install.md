# Installing Columbus

## Cluster setup

Follow these [instructions](https://github.com/columbustech/cdrive/blob/master/docs/cluster.md) to setup your 
Kubernetes cluster with a domain. Let's call the domain example.com for the purpose of this guide.

## Clone repository

Clone the GitHub repo

```
git clone https://www.github.com/columbustech/cdrive.git
```

## TLS Certificates

Install Cert Manager for issuing TLS certificates

```bash
# Install the CustomResourceDefinition resources separately
kubectl apply --validate=false -f https://github.com/jetstack/cert-manager/releases/download/v0.14.0/cert-manager.crds.yaml

# Create the namespace for cert-manager
kubectl create namespace cert-manager

# Label the cert-manager namespace to disable resource validation
kubectl label namespace cert-manager certmanager.k8s.io/disable-validation=true

# Add the Jetstack Helm repository
helm repo add jetstack https://charts.jetstack.io

# Update your local Helm chart repository cache
helm repo update

# Install the cert-manager Helm chart
helm install cert-manager --namespace cert-manager jetstack/cert-manager --version v0.14.0 \
--set ingressShim.defaultIssuerName=letsencrypt-prod \
--set ingressShim.defaultIssuerKind=ClusterIssuer
```

Check that webhook pod is running correctly (May take a couple of minutes for the pod to start)

```bash
kubectl get pods -n cert-manager
```

Create a TLS certificate issuer

Edit cluster-issuer.yaml by entering your email in the email field. The file is located at scripts/cluster-issuer.yaml.
And then create the cluster issuer:

```bash
kubectl apply -f cdrive/scripts/letsencrypt-prod.yaml
```

## Ingress Controller

Install Nginx Ingress Controller

```
helm repo add stable https://kubernetes-charts.storage.googleapis.com/
helm repo update
helm install nginx-ingress --namespace kube-system stable/nginx-ingress
```

Get external IP for the ingress controller (May show 'pending' for a few minutes)

```
kubectl -n kube-system get svc ingress-nginx-controller
```

Possible issue: Services don't get allocated an external IP. External IP gets stuck in 'pending' state.
Can be fixed by adding the following to your Kops cluster config.

```
spec:
  additionalPolicies:
    master: |
      [
        {
          "Effect": "Allow",
          "Action": "iam:CreateServiceLinkedRole",
          "Resource": "arn:aws:iam::*:role/aws-service-role/*"
         },
         {
           "Effect": "Allow",
           "Action": [
             "ec2:DescribeAccountAttributes",
             "ec2:DescribeInternetGateways"
            ],
           "Resource": "*"
         }
      ]
```

## DNS Records

Using the AWS console or AWS CLI create DNS alias records for example.com, authentication.example.com, api.example.com 
and registry.example.com. Point these alias records to the external IP of the ingress controller.

## Authentication

Add your CDrive URL (https://example.com/) to cdrive/authentication/debug/cm.yml. Then run the following commands.

```
kubectl apply -f cdrive/authentication/debug
```

Create an admin user

```
kubectl exec -it $(kubectl get pods|awk '/authentication/{print$1}') -- /bin/bash
python manage.py createsuperuser
```

Go to https://authentication.example.com/admin, login into admin account.

Next, go to https://authentication.example.com/o/applications and create a new application

```
Name: CDrive
Client type: Public
Authorization grant type: Authorization Code
Redirect uris: https://example.com/
```

Note the client id and client secret.

## CDrive

Create a new AWS user from the AWS console or the AWS CLI. Give the user full permissions to S3 and Athena (Optional).
Note the access key id and secret access key. 

Create an S3 bucket for CDrive. Under permissions for the bucket, set 'Block all public access' to 'Off'. Add the
following CORS configuration.

```
<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
<CORSRule>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>POST</AllowedMethod>
    <MaxAgeSeconds>3000</MaxAgeSeconds>
    <AllowedHeader>*</AllowedHeader>
</CORSRule>
</CORSConfiguration>
```

Now, fill in all the fields in 
cdrive/api/debug/cm.yml, cdrive/api/debug/ing.yml, cdrive/ui/prod/ing.yml.

Then run the following commands 

```
kubectl apply -f cdrive/api/debug -f cdrive/ui/prod
```

## App manager

Set appropriate permissions on the Kubernetes default service account

```
kubectl create clusterrolebinding default-cluster-admin --clusterrole=cluster-admin --serviceaccount=default:default
```

Fill in the URLs in cdrive/app-manager/cm.yml and deploy the app manager

```
kubectl apply -f cdrive/app-manager/prod
```
## Registry

These are optional instructions to set up a private registry on the cluster. 

Create an htpasswd for basic authentication
```
docker run --entrypoint htpasswd registry:2 -Bbn username password > ./htpasswd
```

Update URLs in cdrive/registry/values.yaml and apply it
```
helm install regname stable/docker-registry -f cdrive/registry/values.yaml --set secrets.htpasswd=$(cat ./htpasswd)
```

Edit kubectl default service account
```
kubectl edit serviceaccount default -n default
```

Add the following to the service account config
```
imagePullSecrets:
- name: regname-docker-registry-secret
```
