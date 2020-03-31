from django.urls import path
from . import views

urlpatterns = [
    path('user-details/', views.UserDetailsView.as_view()),
    path('register-user/', views.RegisterUserView.as_view()),
    path('client-details/', views.ClientDetailsView.as_view()),
    path('users-list/', views.UsersListView.as_view()),
    path('authentication-token/', views.AuthenticationTokenView.as_view()),
    path('app-token/', views.AppTokenView.as_view()),
    path('api-access-token/', views.ApiAccessTokenView.as_view()),
    path('logout/', views.LogoutView.as_view()),
]

