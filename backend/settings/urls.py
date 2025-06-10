from django.urls import path
from .views import UserSettingsView, SystemSettingsListView, SystemSettingDetailView

app_name = 'settings'

urlpatterns = [
    # User settings endpoints
    path('', UserSettingsView.as_view(), name='user_settings'),
    
    # System settings endpoints (admin only)
    path('system/', SystemSettingsListView.as_view(), name='system_settings_list'),
    path('system/<str:key>/', SystemSettingDetailView.as_view(), name='system_setting_detail'),
]
