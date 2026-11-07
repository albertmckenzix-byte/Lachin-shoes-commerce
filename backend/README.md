# Shoe Store Backend

Django + Django REST Framework backend for the shoe store React frontend.

## Setup

```bat
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

## Run

```bat
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

The API is served under `http://127.0.0.1:8000/api/` and the admin panel at
`http://127.0.0.1:8000/admin/`. CORS is configured to allow the Vite dev server
at `http://localhost:5173`.

## Configuration via environment variables

- `DJANGO_SECRET_KEY` — Django secret key (has an insecure dev default)
- `DJANGO_DEBUG` — set to `True`/`False` (defaults to `True`)
