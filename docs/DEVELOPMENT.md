# Development & contribution guide

This guide supplements the [main README](../README.md) with a concise, source-checked workflow for developers. It describes the repository as of November 2026 and does **not** imply the full app has been independently tested.

## Repository layout

- `oyno-backend/` — Django REST Framework API, Channels/WebSocket support, Celery, and Docker configuration
- `oyno-mobile/` — Expo Router / React Native application, written in TypeScript

The mobile app and backend are separate processes. The mobile client requires an accessible backend for real API-backed screens.

## Backend: local setup with Docker

Requirements: Docker and Docker Compose.

```bash
git clone https://github.com/zeuscode-tech/Oyno-2.0.git
cd Oyno-2.0/oyno-backend
cp .env.example .env
# Replace example values and provide environment-specific credentials.
docker compose up --build
```

The Compose file publishes the API on **http://localhost:8080** (container port 8000), starts PostgreSQL 16 and Redis 7, and also defines a Celery worker. Django migrations and `seed_venues` run in the `web` startup command.

After the services are ready, you can inspect:

- `http://localhost:8080/api/schema/` — OpenAPI schema
- `http://localhost:8080/api/docs/` — interactive API documentation
- `http://localhost:8080/admin/` — Django administration (requires credentials)

These are configured routes; their availability depends on a successful startup.

Useful diagnostics:

```bash
docker compose ps
docker compose logs -f web
docker compose logs -f celery
```

**Security:** `.env` is for local configuration, not version control. Do not commit tokens, credentials or Firebase service-account JSON. The values in `.env.example` are examples, not production credentials.

## Mobile: local setup

Requirements: a compatible Node.js/npm setup, Expo tooling, and a supported simulator or device.

```bash
cd oyno-mobile
npm install
npm run start
```

The `package.json` also defines `npm run android`, `npm run ios` and `npm run web`.

Before testing connected features, check which API endpoint the client uses and make sure the phone/emulator can reach the backend. A mobile device generally cannot access your development machine using its own `localhost` address.

The project includes native Firebase packages; features involving push notifications may require platform configuration and credentials. Do not assume these features work in a generic Expo Go environment without verifying the native build.

## API & architecture references

- [Backend URL routes](../oyno-backend/config/urls.py)
- [ASGI / WebSocket entry point](../oyno-backend/config/asgi.py)
- [Backend dependencies](../oyno-backend/requirements.txt)
- [Expo project configuration](../oyno-mobile/app.json)
- [Mobile package scripts](../oyno-mobile/package.json)

The API's configured prefixes include `/api/v1/auth/`, `/api/v1/venues/`, `/api/v1/games/`, `/api/v1/chats/`, `/api/v1/bookings/`, `/api/v1/payments/`, `/api/v1/notifications/`, and `/api/v1/owner/`.

## Making a verifiable contribution

1. Open an issue with a reproducible problem or a narrowly scoped enhancement.
2. Create a feature branch, for example `fix/<short-description>` or `docs/<short-description>`.
3. Keep changes focused. In a pull request, explain **what changed**, **why**, and **how it was checked**.
4. Run the relevant checks available for the affected component. Avoid claiming checks passed if you did not run them.
5. For UI changes, include before/after screenshots; for API changes, provide sample requests, responses, or automated tests as appropriate.
6. Link the issue and PR so that future reviewers can follow the implementation history.

### Pull request checklist

- [ ] The change solves a specific documented problem.
- [ ] Setup instructions and any affected documentation are accurate.
- [ ] No credentials, private user data, or generated environment files were committed.
- [ ] Verification steps and outstanding limitations are described.
- [ ] Screenshots or API examples are included if useful.

This guide records a development process; it does not assign individual authorship for existing code. Use commit and pull request history when describing each contributor's work.
