from django.urls import path
from .views import PaymentMethodListView, InitiatePaymentView, ConfirmPaymentView

urlpatterns = [
    path("methods/",   PaymentMethodListView.as_view(), name="payment-methods"),
    path("initiate/",  InitiatePaymentView.as_view(),   name="payment-initiate"),
    path("confirm/",   ConfirmPaymentView.as_view(),    name="payment-confirm"),
]
