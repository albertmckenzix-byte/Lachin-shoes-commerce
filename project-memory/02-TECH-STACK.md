# Technology Stack

The versions below are taken from repository manifests or source observed during the initial inspection. Re-check package and dependency files before upgrading or relying on an exact version.

## Frontend

- React 19
- Vite 8
- Tailwind CSS 4
- React Router 7
- i18next / react-i18next
- Framer Motion
- JavaScript / JSX

## Backend

- Python
- Django 5.2
- Django REST Framework
- SQLite configured in the inspected backend settings
- Pillow for image handling
- DRF token authentication is used by the frontend admin API client (`Authorization: Token ...`).

## Frontend/backend connection

- Frontend API base URL: `import.meta.env.VITE_API_URL || 'http://localhost:8000'`.
- Public product client calls `/api/products/` and `/api/products/{slug}/`.
- Admin API helper prefixes request paths with `/api` and attaches the stored admin token when present.

## Verify before changing

Check `package.json`, lockfiles, backend requirements/pyproject files, Django settings, URL configuration, and migrations for the authoritative dependency and configuration state. Do not introduce a second framework or duplicate API client without a documented reason.
