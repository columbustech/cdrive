from django.db import models

# Create your models here.
class HostedService(models.Model):
    name = models.CharField(max_length=200)
    url = models.URLField(max_length=200)
    owner = models.ForeignKey('user_mgmt.CDriveUser', on_delete=models.CASCADE, related_name='%(class)s_owner')
    client_id = models.CharField(max_length=200)
    client_secret = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)
    code = models.CharField(max_length=200)
    is_active = models.BooleanField(default=False)
