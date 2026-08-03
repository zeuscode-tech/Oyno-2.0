# OYNO release checklist

## Backend production variables

Copy `oyno-backend/.env.example` to the production secret store and set real values for:

- `SECRET_KEY`, `DEBUG=False`, `ALLOWED_HOSTS`;
- `DB_*` and `REDIS_URL`;
- `SMS_API_URL`, `SMS_EMAIL`, `SMS_PASSWORD`, `SMS_SENDER`;
- payment gateway credentials before enabling payments;
- Firebase credentials before enabling push notifications.

Never commit `.env`, Firebase credentials, SMS passwords or payment secrets.

Validate the backend before deployment:

```powershell
docker compose exec -T web python manage.py check
docker compose exec -T web python manage.py migrate --plan
docker compose exec -T web python manage.py collectstatic --noinput
```

## Mobile release variables

Set these in EAS project environments, not in the repository:

- `EXPO_PUBLIC_API_URL` — public HTTPS API URL ending in `/api/v1`;
- `EXPO_PUBLIC_SENTRY_DSN` — Sentry DSN for the OYNO mobile project.

Run locally before a build:

```powershell
npm run release:check
```

Build profiles are defined in `oyno-mobile/eas.json`:

```powershell
npx eas-cli@latest build --platform android --profile preview
npx eas-cli@latest build --platform ios --profile preview
```

## Data launch gate

Keep imported 2GIS venues in `pending_verification` until the owner confirms the phone, price, schedule and permission to use photos. Only verified venues may be public or bookable.
