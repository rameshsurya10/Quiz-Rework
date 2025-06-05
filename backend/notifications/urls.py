from django.urls import path
from .views import NotificationListView, NotificationDetailView, MarkNotificationReadView

urlpatterns = [
    path('notifications/', NotificationListView.as_view(), name='notification-list'),
    path('notifications/<uuid:pk>/', NotificationDetailView.as_view(), name='notification-detail'),
    path('notifications/<uuid:pk>/read/', MarkNotificationReadView.as_view(), name='notification-mark-read'),
]
