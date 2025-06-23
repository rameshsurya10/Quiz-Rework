from django.urls import path
from .views import dashboard_data

app_name = 'dashboard'

urlpatterns = [
    path('', dashboard_data, name='dashboard_data'),  # responds to /api/dashboard/
]
