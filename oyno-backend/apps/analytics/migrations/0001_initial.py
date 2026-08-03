from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="AnalyticsEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("event_name", models.CharField(max_length=100)),
                ("properties", models.JSONField(blank=True, default=dict)),
                ("platform", models.CharField(blank=True, default="", max_length=20)),
                ("app_version", models.CharField(blank=True, default="", max_length=30)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="analytics_events", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="analyticsevent",
            index=models.Index(fields=["event_name", "created_at"], name="analytics_a_event_n_2b3b9b_idx"),
        ),
    ]
