from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='bio',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='user',
            name='main_sport',
            field=models.CharField(
                blank=True,
                choices=[
                    ('football', 'Футбол'),
                    ('basketball', 'Баскетбол'),
                    ('volleyball', 'Волейбол'),
                    ('tennis', 'Теннис'),
                    ('other', 'Другое'),
                ],
                default='',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='skill_level',
            field=models.CharField(
                choices=[
                    ('beginner', 'Новичок'),
                    ('intermediate', 'Любитель'),
                    ('advanced', 'Продвинутый'),
                    ('pro', 'Профессионал'),
                ],
                default='beginner',
                max_length=20,
            ),
        ),
    ]
