from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('chats', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='chatmessage',
            name='media_file',
            field=models.FileField(blank=True, null=True, upload_to='chat_media/'),
        ),
        migrations.AddField(
            model_name='chatmessage',
            name='media_type',
            field=models.CharField(
                choices=[('text', 'Текст'), ('image', 'Изображение'), ('video', 'Видео'), ('audio', 'Голосовое')],
                default='text',
                max_length=10,
            ),
        ),
        migrations.AlterField(
            model_name='chatmessage',
            name='text',
            field=models.TextField(blank=True, default=''),
        ),
    ]
