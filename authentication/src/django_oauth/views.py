from django.contrib.auth.models import User
from django.contrib import messages
from django.shortcuts import render, redirect
from django.http import JsonResponse, HttpResponse
from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from oauth2_provider.models import Application
import requests, re, os

def create_account(request):
    if request.method == 'POST':
        if os.environ['PRIVATE_DEPLOYMENT'] == "TRUE":
            account_creation_code = request.POST['code']
            if account_creation_code != os.environ['ACCOUNT_CREATION_CODE']:
                messages.error(request, "Incorrect account creation code")
                return render(request, 'registration/create-user.html')

        username = request.POST['username']
        if User.objects.filter(username=username).exists():
            messages.error(request, "Sorry, this username is already taken")
            return render(request, 'registration/create-user.html')

        if not re.match("^[a-z0-9]*$", username):
            messages.error(request, "Username can only contain lower case letters and numbers")
            return render(request, 'registration/create-user.html')
        
        password = request.POST['password']
        confirm = request.POST['confirm']
        if len(password) < 6:
            messages.error(request, "The password needs to contain at least 6 characters")
            return render(request, 'registration/create-user.html')
        if password != confirm:
            messages.error(request, "The password and confirmation password do not match")
            return render(request, 'registration/create-user.html')

        user = User.objects.create_user(
            username = request.POST['username'],
            password = request.POST['password']
        )
        data = { 
            'username': request.POST['username'],
            'email': request.POST['email'],
            'firstname': request.POST['firstname'],
            'lastname': request.POST['lastname']
        }
        
        requests.post(url='http://cdrive/register-user/', data=data)

        cdrive_url = Application.objects.filter(name='CDrive')[0].redirect_uris
        return render(request, 'registration/create-success.html', {'cdrive_url': cdrive_url})

    elif request.method == 'GET':
        return render(request, 'registration/create-user.html')

@method_decorator(csrf_exempt)
def register_application(request):
    if request.method == 'POST':
        app_name = request.POST['app_name']
        redirect_url = request.POST['redirect_url']
        app = None
        if Application.objects.filter(name=app_name).exists():
            app = Application.objects.filter(name=app_name)[0]
            app.redirect_uris = app.redirect_uris + " " + redirect_url
        else:
            admin_user = User.objects.all()[0]
            app = Application(
                name = app_name,
                user = admin_user,
                redirect_uris = redirect_url,
                client_type = Application.CLIENT_PUBLIC,
                authorization_grant_type = Application.GRANT_AUTHORIZATION_CODE,
                skip_authorization = True
            )
            
        app.save()
        return JsonResponse({'clientId': app.client_id, 'clientSecret': app.client_secret}, status=201)

    else:
        return HttpResponse(status=200)
