# User Guide

## Installing apps

1. Click on the Applications tab from your CDrive home page
2. Click install on the top right hand side of the Applications tab
3. Enter the URL to the app image and click on install

The app can be on a public image registry such as Docker Hub or a private registry within CDrive. If, for example, you want to install the tablebrowser app from the ColumbusTech app store, the app image URL will be docker.io/columbustech/tablebrowser:latest

If you followed the instructions for creating your own CDrive app and pushed it to the private registry, you can install it by specifying its URL. For example, to install my-cdrive-app from the private registry, the app image URL will be registry.\<CDRIVE\_URL\>/\<docker\_username\>/my-cdrive-app:1.0.
