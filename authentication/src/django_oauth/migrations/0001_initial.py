from django.db import migrations, models
from django.contrib.auth.models import User
from oauth2_provider.models import Application


def create_super_user(apps, schema_editor):
    User.objects.create_superuser(os.getenv('SUPERUSER_NAME'), os.getenv('SUPERUSER_PASSWORD'))


def create_application(apps, schema_editor):
    app = Application(
                name = os.getenv('APP_NAME'),
                user = User.objects.all()[0],
                redirect_uris = os.getenv('CDRIVE_URL'),
                client_type = Application.CLIENT_PUBLIC,
                authorization_grant_type = Application.GRANT_AUTHORIZATION_CODE,
                skip_authorization = True
            )
    app.save()


class Migration(migrations.Migration):
    dependencies = []
    operations = [migrations.RunPython(create_super_user,create_application),
    ] 
