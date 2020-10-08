# Columbus App Development Guide

## Writing an app

CDrive apps are web applications running inside a docker container. Apps can expose a GUI or a REST API or both. Ideally apps should expose both so that users can run the apps through the browser or any of CDrive's programmatic interfaces.

### Specifications for writing an app

1. Create a docker image of the app on your local machine
2. The image should expose the GUI and/or REST API on port 8000 of the container
3. GUI should be on the path /app/\<user\_name\>/\<app\_name\>/
4. REST API should be on the path /app/\<user\_name\>/\<app\_name\>/api/
5. The app should use the Oauth service provided by CDrive to authenticate users.
6. Apps can use Kubernetes REST API to create their own resources on the Kubernetes cluster for different purposes such as scaling up execution
7. Once you have built the app on your local machine, you can follow the steps in the next section to push it to a private or public image registry.

## Pushing an app to an image registry

Once an app has been built, it can be pushed to a public image registry such as Docker Hub or Google Container Registry or it can be pushed to a private registry. CDrive [deployment instructions](https://github.com/columbustech/cdrive/blob/master/docs/install.md#registry) contains optional steps for deploying a private image registry on CDrive.

Let's say you created an app image named my-cdrive-app on your local machine with the following command:

```bash
docker build -t my-cdrive-app:1.0 .
```

You can now push it to a registry of your choice as detailed below.

### Pushing an app to Docker Hub

Login to docker hub

```bash
docker login
```
and then enter username and password when prompted

Tag your image
```bash
docker tag my-cdrive-app:1.0 <docker_username>/my-cdrive-app:1.0
```

Push image to Docker Hub

```bash
docker push <docker_username>/my-cdrive-app:1.0
```

### Pushing an app to private registry

Follow the instructions on CDrive installation page to deploy a private registry.The private registry will be located at registry.\<CDRIVE\_URL\>

Login to the registry

```bash
docker login <REGISTRY_URL>
```
and then enter username and password when prompted

Tag your image

```bash
docker tag my-cdrive-app:1.0 <REGISTRY_URL>/<registry_username>/my-cdrive-app:1.0
```

Push image to registry

```bash
docker push <REGISTRY_URL>/<registry_username>/my-cdrive-app:1.0
```

Once your app has been pushed to an image registry, you can follow the instructions in the [user guide](https://github.com/columbustech/cdrive/blob/master/docs/user-guide.md) to download and deploy it on your Columbus deployment.

