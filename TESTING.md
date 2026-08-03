# OYNO testing guide

## 1. Prepare the environment

Start the backend from `oyno-backend`:

```powershell
docker compose up -d
docker compose ps
```

Expected result: `db` and `redis` are healthy, `web` is running on `http://localhost:8080`.

Run backend checks:

```powershell
docker compose exec -T web python manage.py check
docker compose exec -T web python manage.py migrate --plan
docker compose exec -T web python manage.py collectstatic --noinput
```

Expected result: no system-check errors and `No planned migration operations.`

For a physical phone, do not use `localhost` in the mobile API URL. Use the computer's LAN IP, for example `http://192.168.1.10:8080/api/v1`, and make sure Windows Firewall allows port 8080.

## 2. Public player flow

1. Open the player home screen.
2. Confirm the venue list loads and the sport filters work for football, volleyball, basketball, tennis and swimming.
3. Switch between list and map view.
4. Confirm markers appear for venues with coordinates.
5. Tap a marker and open venue details.
6. Confirm address, sport, price, photos, rating and working hours render correctly.
7. Open the 2GIS link and the phone link from the detail screen.
8. Open a date with available slots.
9. Select a slot and create a booking.
10. Confirm the booking appears in the player's booking list with `pending` status.
11. Repeat the same booking request from a second session and confirm the occupied slot cannot be booked twice.
12. Cancel the booking and confirm the slot becomes available again.

Expected result: no blank screens, duplicate bookings, stale slot state or navigation loops.

## 3. Owner flow

Use a venue-owner account whose phone is verified.

1. Open owner profile and confirm the phone status is visible.
2. Create a venue with name, type, one or more sports, address, city, price, phone and photos.
3. Confirm the new venue is inactive and has `pending_verification` status.
4. Edit the venue and confirm all fields persist after reopening the screen.
5. Add a slot for today or a future date.
6. Reopen the schedule and confirm the slot is listed.
7. Submit the venue for verification.
8. In Django Admin, approve the venue and confirm it appears in the public player catalog.
9. Reject another test venue and confirm it remains hidden from the public catalog.
10. Open owner bookings and confirm a player's booking is visible to the correct venue owner only.

Expected result: an owner cannot edit another owner's venue, and pending/rejected venues never become public.

## 4. Authentication and OTP

1. Register a new player account.
2. Log out and log in again.
3. Request an OTP.
4. Enter an incorrect or expired code and confirm a clear error.
5. Enter the valid code and confirm `phone_verified=true` in the profile.
6. For production, verify that the configured SMS provider receives the message and that no OTP code is written to the response or client logs.

If SMS credentials are not configured, a controlled `503` is expected; configure `SMS_API_URL`, `SMS_EMAIL`, `SMS_PASSWORD` and `SMS_SENDER` before production testing.

## 5. 2GIS catalog and Admin

Import the research catalog once:

```powershell
docker compose exec -T web python manage.py import_2gis_venues --owner-phone +996700000001
```

Confirm in Admin:

- imported cards are `pending_verification` and inactive;
- source URL, phones and photo URLs are visible;
- cards without owner confirmation are not public;
- approval activates only the selected cards.

Do not publish a card until the owner confirms the phone, price, schedule and photo usage rights.

## 6. Analytics and error monitoring

1. Open player home and create a booking.
2. Confirm `venues_viewed` and `booking_created` events are created through `POST /api/v1/analytics/events/`.
3. Configure `EXPO_PUBLIC_SENTRY_DSN` in EAS Preview.
4. Trigger a controlled test error in a preview build and confirm it appears in Sentry.
5. Confirm analytics failures never block browsing or booking.

## 7. Automated checks

From `oyno-mobile`:

```powershell
npm ci
npm run release:check
npm ci --dry-run --include=dev --ignore-scripts --no-audit --no-fund
```

From `oyno-backend`:

```powershell
python -m compileall -q apps manage.py
docker compose exec -T web python manage.py check
docker compose exec -T web python manage.py migrate --plan
```

## 8. Release gate

Before creating a preview build, set these EAS Preview variables:

- `EXPO_PUBLIC_API_URL` — public HTTPS API URL ending with `/api/v1`;
- `EXPO_PUBLIC_SENTRY_DSN` — Sentry DSN, if monitoring is enabled.

Then run:

```powershell
npx eas-cli@latest build --platform android --profile preview
```

Install the APK on at least one physical Android device and repeat sections 2–6. Do not submit to Google Play or App Store until the public API, SMS provider, payment provider and store credentials have been verified.
