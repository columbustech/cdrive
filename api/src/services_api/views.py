from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from rest_framework.parsers import JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

import requests
import random, string

from user_mgmt.utils import introspect_token
from .models import HostedService
from .serializers import HostedServiceSerializer

class CreateService(APIView):
    parser_class = (JSONParser, )

    @csrf_exempt
    def post(self, request):
        cDriveUser, cDriveApp = introspect_token(request)

        service_url = request.data['serviceUrl']
        service_name = request.data['serviceName']

        data = {
            'app_name': service_name,
            'redirect_url': service_url 
        }

        response = requests.post(url='http://authentication/register-app/', data=data)

        data = response.json()

        lnd = string.ascii_letters + string.digits
        code = ''.join(random.choice(lnd) for i in range(12))

        hostedService = HostedService(
            name = service_name,
            url = service_url,
            owner = cDriveUser,
            client_id = data['clientId'],
            client_secret = data['clientSecret'],
            code = code
        )
        hostedService.save()

        return Response(status=status.HTTP_200_OK)

class LinkService(APIView):
    parser_class = (JSONParser,)

    @csrf_exempt
    def post(self, request):
        code = request.data['code']
        
        hs = HostedService.objects.filter(is_active=False, code=code)

        if hs.exists():
            hs[0].is_active = True
            hs[0].save()
            return Response({
                'client_id': hs[0].client_id, 
                'client_secret': hs[0].client_secret,
                'username': hs[0].owner
            }, status=status.HTTP_200_OK)
        else:
            return Response(status=HTTP_400_BAD_REQUEST)

class ServicesList(APIView):
    parser_class = (JSONParser,)

    @csrf_exempt
    def get(self, request):
        cDriveUser, cDriveApp = introspect_token(request)
        queryset = HostedService.objects.filter(owner = cDriveUser)
        serializer = HostedServiceSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class DeleteService(APIView):
    parser_class = (JSONParser,)

    @csrf_exempt
    def post(self, request):
        cDriveUser, cDriveApp = introspect_token(request)
        url = request.data['service_url']
        HostedService.objects.filter(owner=cDriveUser, url=url).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
