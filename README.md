# Crypto Monitor

Crypto Monitor is a full-stack web application for tracking cryptocurrency prices, storing price history, showing market summaries, and managing price alerts.

The project has four main responsibilities:

1. Collect cryptocurrency prices from CoinGecko on a schedule.
2. Persist current and historical market data in PostgreSQL.
3. Expose a REST API for dashboard, list, detail, history, alerts, and operational data.
4. Provide a React frontend for browsing coins, viewing charts, and creating alerts.

## What The Project Does

The application monitors a predefined set of cryptocurrencies and keeps their market data updated over time.

Main features:

- Dashboard with summary metrics and top gainers/losers.
- Cryptocurrency list with search and latest price snapshot.
- Cryptocurrency detail page with price chart and manual refresh support.
- Price alerts with create, list, delete, and reset flows.
- Historical price storage for trend visualization.
- Django Admin for operational management.
- Scheduled background jobs for price collection, alert checking, and cleanup.

## How The Project Is Organized

The system is organized into four layers:

- Frontend: React application that renders the UI and calls the API.
- Backend API: Django REST application that exposes the project data and actions.
- Background processing: Celery workers and beat scheduler for periodic tasks.
- Persistence and messaging: PostgreSQL stores data and RabbitMQ brokers background jobs.


## Technology Stack

### Runtime And Infrastructure

| Technology | What it is | What it does in this project |
|---|---|---|
| Bash | Unix shell scripting language | Runs the macOS startup helper script that waits for Docker and opens the frontend |
| Python 3.11 | General-purpose programming language | Runs the backend, tasks, and management commands |
| Django 4.2 | Python web framework | Provides the main backend application structure, ORM, admin, and settings system |
| Django REST Framework | API framework for Django | Builds the REST API consumed by the frontend |
| django-cors-headers | Django middleware package | Allows the frontend to call the backend across origins during development |
| Celery | Distributed task queue | Runs asynchronous and scheduled jobs such as price collection and alert checks |
| django-celery-beat | Celery schedule persistence extension | Included in the project dependencies for database-backed scheduling support |
| django-celery-results | Celery result persistence extension | Included in the project dependencies for storing Celery task results in Django |
| PostgreSQL 15 | Relational database | Stores cryptocurrencies, price history, alerts, and collection logs |
| psycopg2-binary | PostgreSQL driver for Python | Connects Django to PostgreSQL |
| RabbitMQ | Message broker | Queues Celery tasks between beat and workers |
| Requests | Python HTTP client | Calls the external CoinGecko API from background tasks |
| Gunicorn | Python WSGI server | Serves the Django application in containerized runtime |
| Docker | Container runtime | Packages the services into reproducible environments |
| Docker Compose | Multi-container orchestration tool | Starts database, broker, backend, worker, beat, and frontend together |
| Nginx | Web server and reverse proxy | Serves the production frontend build and proxies `/api` requests |
| CoinGecko API | External cryptocurrency market API | Supplies price, volume, and change data |

### Frontend

| Technology | What it is | What it does in this project |
|---|---|---|
| React 18 | UI library | Builds the application interface |
| React DOM | React renderer for the browser | Mounts the React application into the browser DOM |
| TypeScript | Typed superset of JavaScript | Adds static typing to the frontend code |
| Vite | Frontend build and dev server tool | Runs the development server and builds the production frontend bundle |
| @vitejs/plugin-react | Official Vite React plugin | Enables React Fast Refresh and JSX handling in Vite |
| React Router | Client-side routing library | Handles navigation between dashboard, list, detail, and alerts pages |
| Axios | HTTP client | Sends frontend requests to the backend API |
| Recharts | Charting library | Renders the cryptocurrency history chart |
| Lucide React | Icon library | Provides UI icons used across the application |
| date-fns | Date utility library | Formats chart timestamps and other date values |
| clsx | Conditional class helper | Simplifies conditional Tailwind class composition |
| Tailwind CSS | Utility-first CSS framework | Styles the frontend UI |
| PostCSS | CSS transformation tool | Processes Tailwind CSS during build |
| Autoprefixer | PostCSS plugin | Adds vendor prefixes to compiled CSS |

### Quality And Developer Tooling

| Technology | What it is | What it does in this project |
|---|---|---|
| Pytest | Python testing framework | Runs backend automated tests |
| pytest-django | Django plugin for Pytest | Integrates Django settings, database, and test helpers |
| pytest-cov | Coverage plugin for Pytest | Adds coverage reporting support |
| Flake8 | Python linter | Checks Python style and common issues |
| Black | Python formatter | Formats Python source code consistently |
| isort | Import sorter for Python | Normalizes Python import ordering |
| mypy | Static type checker for Python | Checks Python typing correctness |
| django-stubs | Type stubs for Django | Improves static typing support for Django code |
| @types/react | TypeScript type package for React | Provides static typing for React APIs in the frontend |
| @types/react-dom | TypeScript type package for React DOM | Provides static typing for browser rendering APIs |
| ESLint | JavaScript/TypeScript linter | Validates frontend code quality |
| @typescript-eslint/parser | ESLint parser for TypeScript | Lets ESLint understand TypeScript syntax |
| @typescript-eslint/eslint-plugin | ESLint rules for TypeScript | Adds TypeScript-specific lint rules |
| eslint-plugin-react-hooks | ESLint plugin for React Hooks | Validates hook usage patterns |
| eslint-plugin-react-refresh | ESLint plugin for React Fast Refresh | Prevents patterns that break hot reloading |


## Project Structure

### Root

| Path | Purpose |
|---|---|
| `.gitignore` | Ignore rules for Python, Node, Docker, build, cache, and local environment artifacts |
| `README.md` | Project documentation |
| `docker-compose.yml` | Development stack definition |
| `docker-compose.prod.yml` | Production-oriented stack definition |
| `start_crypto_monitor.command` | macOS helper script that opens Docker and starts the stack |

### Backend Root

| Path | Purpose |
|---|---|
| `backend/manage.py` | Django command entry point |
| `backend/Dockerfile` | Backend container build definition |
| `backend/requirements.txt` | Python dependency list |
| `backend/pytest.ini` | Pytest configuration for the backend |

### Backend Configuration

| Path | Purpose |
|---|---|
| `backend/config/__init__.py` | Django config package initializer |
| `backend/config/settings.py` | Central Django settings, database config, REST config, Celery config, CORS, and logging |
| `backend/config/urls.py` | Root URL configuration for admin, API, and health check |
| `backend/config/wsgi.py` | WSGI entry point used by Gunicorn |
| `backend/config/celery.py` | Celery app setup and periodic task schedule |

### Backend Application

| Path | Purpose |
|---|---|
| `backend/core/__init__.py` | Core app package marker |
| `backend/core/apps.py` | Django app configuration for `core` |
| `backend/core/access.py` | Alert token handling and access control helpers |
| `backend/core/admin.py` | Django Admin configuration for core models |
| `backend/core/models.py` | Database models for cryptocurrencies, price history, alerts, and collection logs |
| `backend/core/querysets.py` | Query helpers for annotated price data |
| `backend/core/serializers.py` | API serializers and query parameter validators |
| `backend/core/tasks.py` | Celery tasks for fetching prices, checking alerts, and cleaning old history |
| `backend/core/tests.py` | Backend automated tests |
| `backend/core/urls.py` | API router and endpoint registration |
| `backend/core/views.py` | API viewsets and API views |


### Frontend Root

| Path | Purpose |
|---|---|
| `frontend/.eslintrc.json` | ESLint rules for the frontend codebase |
| `frontend/package.json` | Frontend scripts and dependency manifest |
| `frontend/package-lock.json` | Locked dependency graph for reproducible installs |
| `frontend/index.html` | HTML entry file used by Vite |
| `frontend/vite.config.ts` | Vite config, dev port, and API proxy |
| `frontend/tsconfig.json` | Main TypeScript configuration |
| `frontend/tsconfig.node.json` | TypeScript config for Vite/node-side files |
| `frontend/tailwind.config.js` | Tailwind theme and content configuration |
| `frontend/postcss.config.js` | PostCSS plugin configuration |
| `frontend/Dockerfile.dev` | Development frontend container |
| `frontend/Dockerfile` | Production frontend container build |
| `frontend/nginx.conf` | Nginx config for serving the built SPA and proxying the API |

### Frontend Application

| Path | Purpose |
|---|---|
| `frontend/src/main.tsx` | React application bootstrap |
| `frontend/src/App.tsx` | Router configuration |
| `frontend/src/index.css` | Global styles and UI utility classes |
| `frontend/src/vite-env.d.ts` | Frontend environment variable typings |
| `frontend/src/services/api.ts` | Central API client and endpoint wrappers |
| `frontend/src/types/index.ts` | Shared frontend types for API data |
| `frontend/src/utils/format.ts` | Number, price, percentage, and date formatting helpers |

### Frontend Components

| Path | Purpose |
|---|---|
| `frontend/src/components/Layout.tsx` | Main shell, navigation, and layout wrapper |
| `frontend/src/components/CryptoCard.tsx` | Reusable card for one cryptocurrency snapshot |
| `frontend/src/components/PriceChart.tsx` | Price history chart component |
| `frontend/src/components/AlertForm.tsx` | Alert creation modal/form |
| `frontend/src/components/LoadingSpinner.tsx` | Generic loading UI |

### Frontend Pages

| Path | Purpose |
|---|---|
| `frontend/src/pages/Dashboard.tsx` | Summary dashboard with stats and top movers |
| `frontend/src/pages/CryptoList.tsx` | Searchable cryptocurrency list |
| `frontend/src/pages/CryptoDetail.tsx` | Single-coin detail view with chart and refresh action |
| `frontend/src/pages/Alerts.tsx` | Alert management page |

## API Surface

Main routes exposed by the backend:

- `GET /health/` — service health check.
- `GET /api/cryptos/` — list cryptocurrencies.
- `GET /api/cryptos/{id}/` — get one cryptocurrency.
- `POST /api/cryptos/{id}/refresh/` — request a manual price refresh.
- `GET /api/cryptos/{id}/history/?hours=24` — get chart history for one cryptocurrency.
- `GET /api/dashboard/` — dashboard summary metrics.
- `GET/POST /api/alerts/` — list and create alerts.
- `GET/PATCH/DELETE /api/alerts/{id}/` — manage a specific alert.
- `POST /api/alerts/{id}/reset/` — reactivate a triggered alert.
- `GET /api/prices/` — generic price history endpoint.
- `GET /api/logs/` — collection log endpoint for operational use.
- `POST /api/fetch/` — manually trigger price collection.

## Installation

### Docker Compose

Requirements:

- Docker Desktop or Docker Engine
- Docker Compose

Start the full stack:

```bash
docker compose up -d --build
```

Stop the stack:

```bash
docker compose down
```

## Accessing The Application

After the stack is running, the default endpoints are:

| Service | URL |
|---|---|
| Frontend | `http://localhost:3000` |
| Backend API | `http://localhost:8000/api/` |
| Django Admin | `http://localhost:8000/admin/` |
| Health Check | `http://localhost:8000/health/` |
| RabbitMQ Management | `http://localhost:15672` |

Default RabbitMQ credentials:

- Username: `guest`
- Password: `guest`

## Creating A Superuser

```bash
docker compose exec backend python manage.py createsuperuser
```

Then open:

```text
http://localhost:8000/admin/
```
