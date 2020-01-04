from django.views.decorators.csrf import csrf_exempt
from django.conf import settings

from rest_framework.parsers import FileUploadParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

import boto3
from botocore.client import Config

import csv, io

from user_mgmt.utils import introspect_token, get_user, get_app
import jwt, datetime

from .models import CDriveFile, CDriveFolder
from .serializers import CDriveFileSerializer, CDriveFolderSerializer
from .utils import *

class UploadView(APIView):
    parser_class = (FileUploadParser,)

    @csrf_exempt
    def post(self, request):
        cDriveUser, cDriveApp = introspect_token(request)
        if cDriveUser == None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)

        path = request.data['path']
        folders = []
        parent = get_object_by_path(path)
        while parent is None:
            last_index = path.rfind('/')
            folders.append(path[last_index+1:])
            path = path[:last_index]
            parent = get_object_by_path(path)

        if check_permission(parent, cDriveUser, cDriveApp, 'E'):
            for folder in reversed(folders):
                cDriveFolder = CDriveFolder(
                    name = folder,
                    owner = cDriveUser,
                    parent = parent
                )
                cDriveFolder.save()
                parent = cDriveFolder
                
            cDriveFile = CDriveFile(
                cdrive_file = request.data['file'],
                name = request.data['file'].name,
                owner = cDriveUser,
                parent = parent,
                size = request.data['file'].size
            )
            cDriveFile.save()
            return Response({'file_name':request.data['file'].name}, status=status.HTTP_201_CREATED)
        else :
            return Response(status=status.HTTP_403_FORBIDDEN)

class InitiateUploadAlt(APIView):
    parser_class = (JSONParser,)

    @csrf_exempt
    def post(self, request):
        cDriveUser, cDriveApp = introspect_token(request)
        if cDriveUser == None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)

        path = request.data['path']

        parent_path = path[:path.rfind('/')]
        folders = []
        parent = get_object_by_path(parent_path)
        while parent is None:
            last_index = parent_path.rfind('/')
            folders.append(parent_path[last_index+1:])
            parent_path = parent_path[:last_index]
            parent = get_object_by_path(parent_path)

        if check_permission(parent, cDriveUser, cDriveApp, 'E'):
            for folder in reversed(folders):
                cDriveFolder, created = CDriveFolder.objects.get_or_create(
                    name = folder,
                    owner = cDriveUser,
                    parent = parent
                )
                parent = cDriveFolder
                
            client = boto3.client(
                's3', 
                region_name = 'us-east-1',
                config=Config(signature_version='s3v4'),
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            )
            response = client.generate_presigned_post(settings.AWS_STORAGE_BUCKET_NAME, path, ExpiresIn=3600)
            upload_id_data = {
                'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1),
                'path': path,
            }
            upload_id = jwt.encode(upload_id_data, settings.COLUMBUS_CLIENT_SECRET, algorithm='HS256')
            return Response({'url': response['url'], 'fields': response['fields'], 'uploadId': upload_id}, status=status.HTTP_200_OK)
        else :
            return Response(status=status.HTTP_403_FORBIDDEN)

class CompleteUploadAlt(APIView):
    parser_class = (JSONParser,)

    @csrf_exempt
    def post(self, request):
        cDriveUser, cDriveApp = introspect_token(request)
        if cDriveUser == None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)

        upload_id = request.data['uploadId']
        data = jwt.decode(upload_id, settings.COLUMBUS_CLIENT_SECRET, algorithms='HS256')
        path = data['path']

        last_index = path.rfind('/')
        parent_path = path[:path.rfind('/')]
        file_name = path[last_index + 1:]
        parent = get_object_by_path(parent_path)

        if check_permission(parent, cDriveUser, cDriveApp, 'E'):
            resource = boto3.resource(
                's3', 
                region_name = 'us-east-1',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            )
            size = resource.Bucket(settings.AWS_STORAGE_BUCKET_NAME).Object(path).content_length
            cDriveFile = CDriveFile(
                cdrive_file = path,
                name = file_name,
                owner = cDriveUser,
                parent = parent,
                size = size
            )
            cDriveFile.save()
            return Response({'file_name':file_name}, status=status.HTTP_201_CREATED)
        else :
            return Response(status=status.HTTP_403_FORBIDDEN)

class InitiateChunkedUpload(APIView):
    parser_class = (JSONParser,)

    def post(self, request):
        cDriveUser, cDriveApp = introspect_token(request)
        if cDriveUser == None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        
        original_path = request.data['path']
        file_name = request.data['file_name']
        
        folders = []
        path = original_path
        parent = get_object_by_path(path)
        while parent is None:
            last_index = path.rfind('/')
            folders.append(path[last_index+1:])
            path = path[:last_index]
            parent = get_object_by_path(path)


        if check_permission(parent, cDriveUser, cDriveApp, 'E'):
            for folder in reversed(folders):
                cDriveFolder = CDriveFolder(
                    name = folder,
                    owner = cDriveUser,
                    parent = parent
                )
                cDriveFolder.save()
                parent = cDriveFolder
        
            key = original_path + '/' + file_name
            client = boto3.client(
                's3',
                region_name = 'us-east-1',
                config=Config(signature_version='s3v4'),
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            )

            mpu = client.create_multipart_upload(Bucket=settings.AWS_STORAGE_BUCKET_NAME, Key=key)

            return Response({'uploadId': mpu['UploadId']}, status=status.HTTP_200_OK)
        else :
            return Response(status=status.HTTP_403_FORBIDDEN)

class UploadChunk(APIView):
    parser_class = (FileUploadParser,)

    def post(self, request):
        cDriveUser, cDriveApp = introspect_token(request)
        if cDriveUser == None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        path = request.data['path']
        file_name = request.data['file_name']
        part_number = int(request.data['partNumber'])
        upload_id = request.data['uploadId']
        chunk_data = request.data['chunk']
        key = path + '/' + file_name

        client = boto3.client(
            's3',
            region_name = 'us-east-1',
            config=Config(signature_version='s3v4'),
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )

        part_info = client.upload_part(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=key,
            PartNumber=part_number,
            UploadId=upload_id,
            Body=chunk_data
        )

        etag = part_info['ETag'].strip('\"')

        return Response({'ETag': etag}, status=status.HTTP_200_OK)

class CompleteChunkedUpload(APIView):
    parser_class = (JSONParser,)

    def post(self, request):
        cDriveUser, cDriveApp = introspect_token(request)
        if cDriveUser == None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        path = request.data['path']
        file_name = request.data['file_name']
        upload_id = request.data['uploadId']
        parts = request.data['partInfo']
        size = request.data['size']
        
        part_info = { 'Parts': [] }
        parts = parts.split(',')
        for i, part in enumerate(parts, start=1):
            info = { 'ETag': part, 'PartNumber': i }
            part_info['Parts'].append(info)

        key = path + '/' + file_name

        client = boto3.client(
            's3',
            region_name = 'us-east-1',
            config=Config(signature_version='s3v4'),
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )

        client.complete_multipart_upload(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=key,
            UploadId=upload_id,
            MultipartUpload=part_info
        )

        parent = get_object_by_path(path)

        if check_permission(parent, cDriveUser, cDriveApp, 'E'):
            cDriveFile = CDriveFile(
                cdrive_file = path + '/' + file_name,
                name = file_name,
                owner = cDriveUser,
                parent = parent,
                size = size
            )
            cDriveFile.save()
            return Response({'file_name':file_name}, status=status.HTTP_201_CREATED)
        else :
            return Response(status=status.HTTP_403_FORBIDDEN)

class CreateView(APIView):
    parser_class = (JSONParser,)

    @csrf_exempt
    def post(self, request):
        cDriveUser, cDriveApp = introspect_token(request)
        if cDriveUser == None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        path = request.data['path']
        name = request.data['name']

        parent = get_object_by_path(path)

        if check_permission(parent, cDriveUser, cDriveApp, 'E'):
            cDriveFolder = CDriveFolder(
                name = name,
                owner = cDriveUser,
                parent = parent
            )
            cDriveFolder.save()
            return Response({'name': name}, status=status.HTTP_201_CREATED)
        else :
            return Response(status=status.HTTP_403_FORBIDDEN)

class ListView(APIView):
    parser_class = (JSONParser,)

    @csrf_exempt
    def get(self, request):
        cDriveUser, cDriveApp = introspect_token(request)
        if cDriveUser == None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        path = request.query_params['path']
        parent = get_object_by_path(path)

        data = {}

        if check_permission(parent, cDriveUser, cDriveApp, 'E'):
            data['permission'] = 'Edit'
        else: 
            data['permission'] = 'View'
        
        data['driveObjects'] = []
        folders = CDriveFolder.objects.filter(parent=parent)
        for f in folders:
            ser = CDriveFolderSerializer(f).data
            if check_permission(f, cDriveUser, cDriveApp, 'E'):
                ser['permission'] = 'Edit'
                ser['type'] = 'Folder'
                data['driveObjects'].append(ser)
            elif check_permission(f, cDriveUser, cDriveApp, 'V'):
                ser['permission'] = 'View'
                ser['type'] = 'Folder'
                data['driveObjects'].append(ser)
            elif check_child_permission(f, cDriveUser, cDriveApp):
                ser['permission'] = 'View'
                ser['type'] = 'Folder'
                data['driveObjects'].append(ser)

        files = CDriveFile.objects.filter(parent=parent)
        for f in files:
            ser = CDriveFileSerializer(f).data
            if check_permission(f, cDriveUser, cDriveApp, 'E'):
                ser['permission'] = 'Edit'
                ser['type'] = 'File'
                data['driveObjects'].append(ser)
            elif check_permission(f, cDriveUser, cDriveApp, 'V'):
                ser['permission'] = 'View'
                ser['type'] = 'File'
                data['driveObjects'].append(ser)

        return Response(data, status=status.HTTP_200_OK)

class ListRecursiveView(APIView):
    parser_class = (JSONParser,)

    @csrf_exempt
    def get(self, request):
        cDriveUser, cDriveApp = introspect_token(request)
        if cDriveUser == None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        path = request.query_params['path']
        folder = get_object_by_path(path)
        if folder is None :
            return Response(status=status.HTTP_403_FORBIDDEN)
        if not (check_permission(folder, cDriveUser, cDriveApp, 'V') or check_child_permission(folder, cDriveUser, cDriveApp)):
            return Response(status=status.HTTP_403_FORBIDDEN)
        data = {}
        data['driveObjects'] = serialize_folder_recursive(folder, cDriveUser, cDriveApp, path)
        return Response(data, status=status.HTTP_200_OK)

class DeleteView(APIView):
    parser_class = (JSONParser,)

    @csrf_exempt
    def delete(self, request):
        cDriveUser, cDriveApp = introspect_token(request)
        if cDriveUser == None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        path = request.query_params['path']
        cDriveObject = get_object_by_path(path)
        
        if check_permission(cDriveObject, cDriveUser, cDriveApp, 'E'):
            if cDriveObject.__class__.__name__ == 'CDriveFolder':
                delete_folder(cDriveObject)
            else :
                cDriveObject.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        else :
            return Response(status=status.HTTP_403_FORBIDDEN)

class DownloadView(APIView):
    parser_class = (JSONParser,)

    @csrf_exempt
    def get(self, request):
        cDriveUser, cDriveApp = introspect_token(request)
        if cDriveUser == None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        path = request.query_params['path']
        cDriveObject = get_object_by_path(path)

        if check_permission(cDriveObject, cDriveUser, cDriveApp, 'V'):
            client = boto3.client(
                's3', 
                region_name = 'us-east-1',
                config=Config(signature_version='s3v4'),
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            )
            url = client.generate_presigned_url(
                ClientMethod='get_object',
                Params={
                    'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
                    'Key': path
                },
                ExpiresIn=300
            )
            return Response({'download_url' : url}, status=status.HTTP_200_OK)
        else :
            return Response(status=status.HTTP_403_FORBIDDEN)

class ContentView(APIView):
    parser_class = (JSONParser,)

    @csrf_exempt
    def get(self, request):
        cDriveUser, cDriveApp = introspect_token(request)
        if cDriveUser == None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        path = request.query_params['path']
        cDriveObject = get_object_by_path(path)

        if check_permission(cDriveObject, cDriveUser, cDriveApp, 'V'):
            if cDriveObject.__class__.__name__ == 'CDriveFile':
                content = cDriveObject.cdrive_file.read()
                return Response(content, status=status.HTTP_200_OK)
            else:
                return Response(status=status.HTTP_403_FORBIDDEN)
        else :
            return Response(status=status.HTTP_403_FORBIDDEN)

class JsonContentView(APIView):
    parser_class = (JSONParser,)

    @csrf_exempt
    def get(self, request):
        cDriveUser, cDriveApp = introspect_token(request)
        if cDriveUser == None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        path = request.query_params['path']
        cDriveObject = get_object_by_path(path)

        if check_permission(cDriveObject, cDriveUser, cDriveApp, 'V'):
            if cDriveObject.__class__.__name__ == 'CDriveFile':
                data = []
                csvString = io.StringIO(cDriveObject.cdrive_file.read().decode("utf-8"))
                csvReader = csv.DictReader(csvString)
                for row in csvReader:
                    data.append(row)
                return Response(data, status=status.HTTP_200_OK)
            else:
                return Response(status=status.HTTP_403_FORBIDDEN)
        else :
            return Response(status=status.HTTP_403_FORBIDDEN)

class ShareView(APIView):
    parser_class = (JSONParser,)

    @csrf_exempt
    def post(self, request):
        cDriveUser, cDriveApp = introspect_token(request)
        if cDriveUser == None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)

        if cDriveApp.name != 'cdrive':
            return Response(status=status.HTTP_403_FORBIDDEN)

        path = request.data['path']
        target_type = request.data['targetType']
        target_name = request.data['name']
        permission = request.data['permission']
        cDriveObject = get_object_by_path(path)

        if cDriveObject is None:
            return Response(status=status.HTTP_403_FORBIDDEN)

        if target_type == 'application':
            if check_permission(cDriveObject, cDriveUser, cDriveApp, permission):
                target_app = get_app(target_name, cDriveUser)
                if target_app is None:
                    return Response(status=status.HTTP_400_BAD_REQUEST)
                share_object(cDriveObject, cDriveUser, target_app, permission)
            else :
                return Response(status=status.HTTP_403_FORBIDDEN)
        elif target_type == 'service':
            if check_permission(cDriveObject, cDriveUser, cDriveApp, permission):
                target_service = get_service(target_url, cDriveUser)
                if target_service is None:
                    return Response(status=status.HTTP_400_BAD_REQUEST)
                share_object(cDriveObject, cDriveUser, target_service, permission)
        elif target_type == 'user':
            if cDriveObject.owner != cDriveUser:
                return Response(status=status.HTTP_403_FORBIDDEN)
            target_user = get_user(target_name)
            if target_user is None: 
                return Response(status=status.HTTP_400_BAD_REQUEST)
            target_app = get_app('cdrive', target_user)
            share_object(cDriveObject, target_user, target_app, permission)
        elif target_type == 'public':
            if cDriveObject.owner != cDriveUser:
                return Response(status=status.HTTP_403_FORBIDDEN)
            cDriveObject.is_public = True
            cDriveObject.save()

        return Response(status=status.HTTP_200_OK)
