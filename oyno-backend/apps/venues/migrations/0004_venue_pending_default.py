from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("venues", "0003_venue_catalog_fields"),
    ]

    operations = [
        migrations.AlterField(
            model_name="venue",
            name="verification_status",
            field=models.CharField(
                choices=[
                    ("pending_verification", "Ожидает проверки"),
                    ("verified", "Проверена"),
                    ("rejected", "Отклонена"),
                ],
                default="pending_verification",
                max_length=30,
            ),
        ),
    ]
