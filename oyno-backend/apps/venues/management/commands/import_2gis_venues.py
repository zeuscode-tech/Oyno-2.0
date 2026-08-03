"""Import researched 2GIS venue cards without publishing unverified data.

Usage:
    python manage.py import_2gis_venues --owner-phone +996700000001
"""

import json
from pathlib import Path
from typing import Any
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.users.models import User
from apps.venues.models import Venue


SPORT_IDS = {choice.value for choice in Venue.SportId}
VENUE_TYPES = {choice.value for choice in Venue.VenueType}
DEFAULT_DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "bishkek_2gis_research.json"


class Command(BaseCommand):
    help = "Import researched 2GIS venue cards as inactive pending-verification venues"

    def add_arguments(self, parser):
        parser.add_argument(
            "--owner-phone",
            required=True,
            help="Phone of the catalog owner user that will own imported cards",
        )
        parser.add_argument(
            "--file",
            type=Path,
            default=DEFAULT_DATA_PATH,
            help="Path to the researched venue JSON file",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Validate and print changes without writing to the database",
        )

    def handle(self, *args, **options):
        data_path: Path = options["file"]
        if not data_path.exists():
            raise CommandError(f"Research file not found: {data_path}")

        try:
            payload = json.loads(data_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise CommandError(f"Unable to read research file: {exc}") from exc

        records = payload.get("venues")
        if not isinstance(records, list):
            raise CommandError("Research file must contain a 'venues' list")

        owner = User.objects.filter(phone=options["owner_phone"]).first()
        if owner is None:
            raise CommandError(
                "Owner user was not found. Create/verify a venue-owner account first."
            )
        if owner.role != User.Role.VENUE_OWNER:
            raise CommandError("The selected owner user must have the venue_owner role")

        created_count = 0
        updated_count = 0

        with transaction.atomic():
            for record in records:
                normalized = self._normalize_record(record)
                if options["dry_run"]:
                    self.stdout.write(f"VALID: {normalized['name']} <{normalized['link_2gis']}>")
                    continue

                venue, created = Venue.objects.update_or_create(
                    link_2gis=normalized["link_2gis"],
                    defaults={**normalized, "owner": owner},
                )
                if created:
                    created_count += 1
                else:
                    updated_count += 1

        if options["dry_run"]:
            self.stdout.write(self.style.SUCCESS(f"Validated {len(records)} venue cards"))
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Imported {created_count} new cards, updated {updated_count}; "
                    "all remain inactive until owner verification"
                )
            )

    def _normalize_record(self, record: dict[str, Any]) -> dict[str, Any]:
        name = str(record.get("name", "")).strip()
        link_2gis = str(record.get("source_url", "")).strip()
        if not name or not link_2gis:
            raise CommandError("Every venue must have name and source_url")

        sport_ids = list(dict.fromkeys(record.get("sport_ids") or []))
        invalid_sports = set(sport_ids) - SPORT_IDS
        if not sport_ids or invalid_sports:
            raise CommandError(f"Invalid sport_ids for {name}: {sorted(invalid_sports)}")

        venue_type = record.get("type", Venue.VenueType.FIELD)
        if venue_type not in VENUE_TYPES:
            raise CommandError(f"Invalid venue type for {name}: {venue_type}")

        lat = record.get("lat", 42.8700)
        lng = record.get("lng", 74.5900)

        return {
            "name": name,
            "type": venue_type,
            "sport_id": sport_ids[0],
            "sport_ids": sport_ids,
            "address": str(record.get("address", "")).strip(),
            "city": str(record.get("city", "Бишкек")).strip() or "Бишкек",
            "lat": lat,
            "lng": lng,
            "rating": record.get("rating", 0),
            "reviews_count": record.get("reviews_count", 0),
            # Research notes are not treated as a confirmed price.
            "price_per_hour": 0,
            "description": str(record.get("description", "")).strip(),
            "link_2gis": link_2gis,
            "source_phones": record.get("phones") or [],
            "source_photo_urls": record.get("photo_urls") or [],
            "source_phone_note": str(record.get("phone_note", "")).strip(),
            "verification_status": Venue.VerificationStatus.PENDING,
            "is_active": False,
            "amenities": [],
            "working_hours": {},
            # source_id is intentionally not persisted yet; link_2gis is the idempotency key.
        }
