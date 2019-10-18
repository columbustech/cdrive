from rest_framework import serializers
from .models import HostedService

class HostedServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = HostedService
        fields = ('name', 'url', 'is_active', 'code')
