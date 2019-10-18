from django.urls import path
from . import views

urlpatterns = [
    path('services-list/', views.ServicesList.as_view()),
    path('create-service/', views.CreateService.as_view()),
    path('link-service/', views.LinkService.as_view()),
    path('delete-service/', views.DeleteService.as_view()),
]
