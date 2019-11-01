from django.urls import path
from . import views

urlpatterns = [
    path('create-table/', views.CreateTable.as_view()),
    path('run-query/', views.RunQuery.as_view()),
    path('query-status/', views.QueryStatus.as_view()),
]
