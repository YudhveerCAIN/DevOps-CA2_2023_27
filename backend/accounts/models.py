from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    ROLE_CHOICES = (
        ('ADMIN', 'Admin'),
        ('MANAGER', 'Warehouse Manager'),
        ('AGENT', 'Delivery Agent'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='AGENT')
    phone = models.CharField(max_length=15, blank=True, null=True)

    def __str__(self):
        return f"{self.username} ({self.role})"