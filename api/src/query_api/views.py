from django.conf import settings
from django.views.decorators.csrf import csrf_exempt

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser

import boto3
from botocore.client import Config
import requests

import os

from user_mgmt.utils import introspect_token
from drive_api.utils import *

class CreateTable(APIView):
    parser_class = (JSONParser,)

    def post(self, request):
        cDriveUser, cDriveApp = introspect_token(request)

        table_name = request.data['table_name']
        data_path = request.data['data_path']
        schema_path = request.data['schema_path']

        data_obj = get_object_by_path(data_path)
        schema_obj = get_object_by_path(schema_path)

        if not check_permission(schema_obj, cDriveUser, cDriveApp, 'V'):
            return Response(status=status.HTTP_403_FORBIDDEN)
        if not schema_obj.__class__.__name__ == 'CDriveFile':
            return Response(status=status.HTTP_403_FORBIDDEN)
        if not check_permission(data_obj, cDriveUser, cDriveApp, 'V'):
            return Response(status=status.HTTP_403_FORBIDDEN)
        if not data_obj.__class__.__name__ == 'CDriveFolder':
            return Response(status=status.HTTP_400_BAD_REQUEST)

        schema = schema_obj.cdrive_file.read().decode("utf-8") 

        query_string = (
            'CREATE EXTERNAL TABLE IF NOT EXISTS '
            + table_name
            + '('
            + schema
            + ')'
            + ' ROW FORMAT SERDE \'org.apache.hadoop.hive.serde2.OpenCSVSerde\''
            + ' LOCATION \'s3://'
            + settings.AWS_STORAGE_BUCKET_NAME
            + '/'
            + data_path
            + '/\''
            + ' TBLPROPERTIES ('
            + ' \'skip.header.line.count\' = \'1\''
            + ' )'
        )

        athena = boto3.client(
            'athena',
            region_name = 'us-east-1',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )

        athena.start_query_execution(
            QueryString = query_string,
            QueryExecutionContext = {
                'Database': 'sqlquerier'
            },
            ResultConfiguration = {
                'OutputLocation': 's3://' + settings.AWS_STORAGE_BUCKET_NAME + '/sqlquerier-output/'
            }
        )

        return Response(status=status.HTTP_201_CREATED)

class RunQuery(APIView):
    parser_class = (MultiPartParser, FormParser)

    def post(self, request):
        cDriveUser, cDriveApp = introspect_token(request)

        if cDriveUser is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)

        query_string = request.data['query']
        athena = boto3.client(
            'athena',
            region_name = 'us-east-1',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
        response = athena.start_query_execution(
            QueryString = query_string,
            QueryExecutionContext = {
                'Database': 'sqlquerier'
            },
            ResultConfiguration = {
                'OutputLocation': 's3://' + settings.AWS_STORAGE_BUCKET_NAME + '/sqlquerier-output/'
            }
        )
        return Response({'queryExecutionId': response['QueryExecutionId']}, status=status.HTTP_201_CREATED)

class QueryStatus(APIView):
    parser_class = (JSONParser,)

    def get(self, request):
        cDriveUser, cDriveApp = introspect_token(request)

        if cDriveUser is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)

        queryExecutionId = request.query_params['query_id']
        athena = boto3.client(
            'athena',
            region_name = 'us-east-1',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
        response = athena.get_query_execution(
            QueryExecutionId = queryExecutionId
        )
        data = {}
        state = response['QueryExecution']['Status']['State']
        data['state'] = state
        if 'EngineExecutionTimeInMillis' in response['QueryExecution']['Statistics']:
            data['runtime'] = response['QueryExecution']['Statistics']['EngineExecutionTimeInMillis']
        if state == 'SUCCEEDED':
            s3 = boto3.client(
                's3',
                region_name = 'us-east-1',
                config=Config(signature_version='s3v4'),
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            )

            data['downloadUrl'] = s3.generate_presigned_url(
                ClientMethod='get_object',
                Params={
                    'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
                    'Key': 'sqlquerier-output/' + queryExecutionId + '.csv'
                },
                ExpiresIn=3600
            )

        return Response(data, status=status.HTTP_200_OK)
