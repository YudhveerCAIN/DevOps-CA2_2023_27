from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer
from rest_framework import views, permissions
from rest_framework.response import Response
from django.contrib.auth import get_user_model

User = get_user_model()

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class AgentListView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        agents = User.objects.filter(role='AGENT')
        data = [{"id": u.id, "username": u.username, "phone": u.phone} for u in agents]
        return Response(data)
