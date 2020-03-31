from django.views.decorators.csrf import csrf_exempt
from django.conf import settings

from rest_framework.parsers import JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

import requests, jwt, datetime

from .models import CDriveUser
from .serializers import CDriveUserSerializer

from drive_api.utils import initialize_user_drive
from .utils import introspect_token

class UserDetailsView(APIView):
    parser_class = (JSONParser,)

    @csrf_exempt
    def get(self, request, format=None):
        user, app = introspect_token(request)
        if user is None:
            return Response(status=status.HTTP_400_BAD_REQUEST)
        else :
            serializer = CDriveUserSerializer(user)
            return Response(serializer.data, status=status.HTTP_200_OK)

class RegisterUserView(APIView):
    parser_class = (JSONParser,)

    @csrf_exempt
    def post(self, request, format=None):
        serializer = CDriveUserSerializer(data=request.data)
        if serializer.is_valid():
            cDriveUser = serializer.save()
            initialize_user_drive(cDriveUser)
            return Response(status=status.HTTP_200_OK)
        else:
            return Response(status=status.HTTP_400_BAD_REQUEST)

class UsersListView(APIView):
    parser_class = (JSONParser,)

    @csrf_exempt
    def get(self, request):
        users_query = CDriveUser.objects.all()
        serializer = CDriveUserSerializer(users_query, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class ClientDetailsView(APIView):
    parser_class = (JSONParser,)

    @csrf_exempt
    def get(self, request, format=None):
        data = {
            'client_id': settings.COLUMBUS_CLIENT_ID,
            'auth_url': settings.AUTHENTICATION_URL
        }
        return Response(data, status=status.HTTP_200_OK)

class AuthenticationTokenView(APIView):
    parser_class = (JSONParser,)

    @csrf_exempt
    def post(self, request, format=None):
        code = request.data['code']
        redirect_uri = request.data['redirect_uri']
        data = {
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': redirect_uri,
            'client_id': settings.COLUMBUS_CLIENT_ID,
            'client_secret': settings.COLUMBUS_CLIENT_SECRET
        }
        response = requests.post(url='http://authentication/o/token/', data=data)

        return Response(response.json(), status=response.status_code)

class AppTokenView(APIView):
    parser_class = (JSONParser,)

    @csrf_exempt
    def post(self, request):
        cDriveUser, cDriveApp = introspect_token(request)
        if cDriveUser == None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        if cDriveApp.name != 'cdrive':
            return Response(status=status.HTTP_403_FORBIDDEN)
        app_name = request.data['app_name']
        data = {
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=10),
            'username': cDriveUser.username,
            'app_name': app_name
        }
        token = jwt.encode(data, settings.COLUMBUS_CLIENT_SECRET, algorithm='HS256')
        return Response({'app_token': token}, status=status.HTTP_200_OK)

class ApiAccessTokenView(APIView):
    parser_class = (JSONParser,)

    @csrf_exempt
    def post(self, request):
        if not "username" in request.data:
            return Response(status=status.HTTP_400_BAD_REQUEST)
        if not "password" in request.data:
            return Response(status=status.HTTP_400_BAD_REQUEST)
        data = {
            "username": request.data["username"],
            "password": request.data["password"]
        }
        response = requests.post(url="http://authentication/authenticate/", data=data)
        if response.status_code != 200:
            return Response(status=response.status_code)
        token_data = {
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=10),
            "username": request.data["username"],
            "app_name": "cdrive"
        }
        token = jwt.encode(token_data, settings.COLUMBUS_CLIENT_SECRET, algorithm="HS256")
        return Response({"accessToken": token}, status=status.HTTP_200_OK)

class LogoutView(APIView):
    parser_class = (JSONParser,)

    @csrf_exempt
    def post(self, request):
        auth_header = request.META['HTTP_AUTHORIZATION']
        token = auth_header.split()[1] 
        data = {
            'token': token,
            'client_id': settings.COLUMBUS_CLIENT_ID,
            'client_secret': settings.COLUMBUS_CLIENT_SECRET
        }
        response = requests.post(url='http://authentication/o/revoke_token/', data=data)
        return Response(status=response.status_code)
