"""
python manage.py seed_venues
Создаёт тестового владельца и 6 тестовых площадок в Бишкеке.
"""
from django.core.management.base import BaseCommand
from apps.users.models import User
from apps.venues.models import Venue


VENUES = [
    {
        "name": "Центральный стадион",
        "type": "stadium",
        "sport_id": "football",
        "address": "ул. Токтогула 215",
        "city": "Бишкек",
        "lat": 42.8700,
        "lng": 74.5900,
        "price_per_hour": 2500,
        "description": "Главный стадион города. Полноразмерное поле с искусственным покрытием.",
        "amenities": ["Душевые", "Раздевалки", "Парковка", "Трибуны"],
        "working_hours": {"open": "08:00", "close": "22:00", "days": [1, 2, 3, 4, 5, 6, 7]},
    },
    {
        "name": "SportZone Basketball",
        "type": "court",
        "sport_id": "basketball",
        "address": "пр. Манаса 40",
        "city": "Бишкек",
        "lat": 42.8750,
        "lng": 74.5800,
        "price_per_hour": 1500,
        "description": "Крытые баскетбольные корты NBA-стандарта.",
        "amenities": ["Душевые", "Раздевалки", "Кафе"],
        "working_hours": {"open": "09:00", "close": "23:00", "days": [1, 2, 3, 4, 5, 6, 7]},
    },
    {
        "name": "Aqua Sport Pool",
        "type": "pool",
        "sport_id": "swimming",
        "address": "ул. Советская 112",
        "city": "Бишкек",
        "lat": 42.8680,
        "lng": 74.6000,
        "price_per_hour": 1200,
        "description": "Олимпийский 50-метровый бассейн.",
        "amenities": ["Душевые", "Сауна", "Парковка"],
        "working_hours": {"open": "07:00", "close": "21:00", "days": [1, 2, 3, 4, 5, 6, 7]},
    },
    {
        "name": "Tennis Club Elite",
        "type": "court",
        "sport_id": "tennis",
        "address": "ул. Жибек Жолу 55",
        "city": "Бишкек",
        "lat": 42.8720,
        "lng": 74.5950,
        "price_per_hour": 2000,
        "description": "Профессиональные теннисные корты с хардовым покрытием.",
        "amenities": ["Душевые", "Прокат инвентаря", "Инструктор"],
        "working_hours": {"open": "08:00", "close": "22:00", "days": [1, 2, 3, 4, 5, 6]},
    },
    {
        "name": "Volley Arena",
        "type": "gym",
        "sport_id": "volleyball",
        "address": "ул. Чуй 123",
        "city": "Бишкек",
        "lat": 42.8660,
        "lng": 74.5870,
        "price_per_hour": 1000,
        "description": "Крытый волейбольный зал с профессиональным паркетом.",
        "amenities": ["Душевые", "Трибуны", "Парковка"],
        "working_hours": {"open": "10:00", "close": "22:00", "days": [1, 2, 3, 4, 5, 6, 7]},
    },
    {
        "name": "Mini Football Park",
        "type": "field",
        "sport_id": "football",
        "address": "мкр. Джал, ул. 3",
        "city": "Бишкек",
        "lat": 42.8580,
        "lng": 74.5760,
        "price_per_hour": 800,
        "description": "Мини-футбольное поле 20x40 с искусственным газоном.",
        "amenities": ["Душевые", "Разминочная зона"],
        "working_hours": {"open": "08:00", "close": "23:00", "days": [1, 2, 3, 4, 5, 6, 7]},
    },
]


class Command(BaseCommand):
    help = "Seed test venues in Bishkek"

    def handle(self, *args, **options):
        # Создаём или получаем тестового владельца
        owner, created = User.objects.get_or_create(
            phone="+996700000001",
            defaults={
                "name": "Тест Владелец",
                "role": User.Role.VENUE_OWNER,
                "city": "Бишкек",
                "is_active": True,
            },
        )
        if created:
            owner.set_password("testpass123")
            owner.save()
            self.stdout.write(f"  Создан владелец: {owner.phone} / testpass123")
        else:
            self.stdout.write(f"  Владелец уже существует: {owner.phone}")

        created_count = 0
        for v in VENUES:
            _, was_created = Venue.objects.get_or_create(
                name=v["name"],
                defaults={**v, "owner": owner},
            )
            if was_created:
                created_count += 1

        self.stdout.write(
            self.style.SUCCESS(f"Готово! Создано {created_count} площадок (из {len(VENUES)}).")
        )
