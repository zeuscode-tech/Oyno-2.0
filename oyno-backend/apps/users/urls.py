from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, LoginView, LogoutView, MeView,
    OTPSendView, OTPVerifyView, FCMTokenView,
    PasswordResetRequestView, PasswordResetConfirmView,
    UserSearchView,
)

urlpatterns = [
    path("register/",              RegisterView.as_view(),             name="auth-register"),
    path("login/",                 LoginView.as_view(),                name="auth-login"),
    path("logout/",                LogoutView.as_view(),               name="auth-logout"),
    path("me/",                    MeView.as_view(),                   name="auth-me"),
    path("token/refresh/",         TokenRefreshView.as_view(),         name="token-refresh"),
    path("otp/send/",              OTPSendView.as_view(),              name="otp-send"),
    path("otp/verify/",            OTPVerifyView.as_view(),            name="otp-verify"),
    path("fcm-token/",             FCMTokenView.as_view(),             name="fcm-token"),
    path("password/reset/",        PasswordResetRequestView.as_view(), name="password-reset"),
    path("password/reset/confirm/",PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("users/search/",          UserSearchView.as_view(),           name="users-search"),
]
