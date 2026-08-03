from django.db import migrations, models


def sync_legacy_sports(apps, schema_editor):
    Venue = apps.get_model("venues", "Venue")
    for venue in Venue.objects.all().iterator():
        if not venue.sport_ids:
            Venue.objects.filter(pk=venue.pk).update(sport_ids=[venue.sport_id])


class Migration(migrations.Migration):
    dependencies = [
        ("venues", "0002_venue_link_2gis"),
    ]

    operations = [
        migrations.AddField(
            model_name="venue",
            name="sport_ids",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="venue",
            name="source_phones",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="venue",
            name="source_photo_urls",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="venue",
            name="source_phone_note",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="venue",
            name="verification_status",
            field=models.CharField(
                choices=[
                    ("pending_verification", "Ожидает проверки"),
                    ("verified", "Проверена"),
                    ("rejected", "Отклонена"),
                ],
                default="verified",
                max_length=30,
            ),
        ),
        migrations.AddIndex(
            model_name="venue",
            index=models.Index(fields=["city", "verification_status"], name="venues_city_verif_idx"),
        ),
        migrations.RunPython(sync_legacy_sports, migrations.RunPython.noop),
    ]
