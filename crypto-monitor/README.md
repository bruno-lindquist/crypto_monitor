# 🪙 Crypto Monitor

Monitor de preços de criptomoedas em tempo real com alertas personalizados.

![Python](https://img.shields.io/badge/Python-3.11-blue)
![Django](https://img.shields.io/badge/Django-4.2-green)
![React](https://img.shields.io/badge/React-18-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)
![Celery](https://img.shields.io/badge/Celery-5.3-37814A)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED)

## 📋 Sobre o Projeto

Sistema completo de monitoramento de criptomoedas que coleta preços em tempo real da API do CoinGecko, armazena histórico de preços e permite configurar alertas personalizados.

### Stack Tecnológico

**Backend:**
- Python 3.11 + Django 4.2 + Django REST Framework
- Celery + RabbitMQ (processamento assíncrono)
- PostgreSQL (banco de dados)
- Pytest (testes)

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS (estilização)
- Recharts (gráficos)
- React Router (navegação)

**DevOps:**
- Docker + Docker Compose
- GitHub Actions (CI/CD)
- Nginx (servidor web produção)

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
│                    http://localhost:3000                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (Django REST API)                     │
│                    http://localhost:8000                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Views     │  │ Serializers │  │   Models                │ │
│  │  (API)      │  │             │  │ - Cryptocurrency        │ │
│  │             │  │             │  │ - PriceHistory          │ │
│  │             │  │             │  │ - PriceAlert            │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
         │                                        │
         ▼                                        ▼
┌─────────────────┐                    ┌─────────────────────────┐
│    RabbitMQ     │◄───────────────────│      Celery Beat       │
│  Message Broker │                    │     (Scheduler)         │
│  :5672 / :15672 │                    │  - fetch prices /5min   │
└─────────────────┘                    │  - check alerts /1min   │
         │                             └─────────────────────────┘
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Celery Worker                               │
│  Tasks:                                                         │
│  - fetch_crypto_prices (coleta preços CoinGecko)               │
│  - check_price_alerts (verifica alertas)                       │
│  - cleanup_old_price_history (limpeza diária)                  │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐          ┌─────────────────────────────────────┐
│   PostgreSQL    │          │          CoinGecko API              │
│     :5432       │          │  (Fonte de dados de preços)         │
└─────────────────┘          └─────────────────────────────────────┘
```

## 🚀 Quick Start

### Pré-requisitos

- Docker e Docker Compose instalados
- Git

### Iniciar o Projeto

```bash
# Clone o repositório
git clone <repo-url>
cd crypto-monitor

# Copie o arquivo de ambiente
cp .env.example .env

# Inicie todos os serviços
docker-compose up -d

# Acompanhe os logs
docker-compose logs -f
```

### Acessar a Aplicação

- **Frontend:** http://localhost:3000
- **API:** http://localhost:8000/api/
- **Admin Django:** http://localhost:8000/admin/
- **RabbitMQ Management:** http://localhost:15672 (guest/guest)

### Criar Superusuário (Admin)

```bash
docker-compose exec backend python manage.py createsuperuser
```

## 📁 Estrutura do Projeto

```
crypto-monitor/
├── backend/
│   ├── config/                 # Configurações Django
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── celery.py
│   │   └── wsgi.py
│   ├── core/                   # App principal
│   │   ├── models.py           # Modelos de dados
│   │   ├── views.py            # API Views
│   │   ├── serializers.py      # Serializers DRF
│   │   ├── tasks.py            # Celery Tasks
│   │   ├── urls.py             # Rotas da API
│   │   ├── admin.py            # Admin customizado
│   │   └── tests.py            # Testes
│   │   └── management/
│   │       └── commands/
│   │           └── seed_cryptos.py  # Seed inicial
│   ├── requirements.txt
│   ├── Dockerfile
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── components/         # Componentes React
│   │   ├── pages/              # Páginas
│   │   ├── services/           # API Client
│   │   ├── hooks/              # Custom Hooks
│   │   ├── types/              # TypeScript Types
│   │   ├── utils/              # Utilitários
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── Dockerfile
│   └── Dockerfile.dev
├── .github/
│   └── workflows/
│       └── ci.yml              # CI/CD Pipeline
├── docker-compose.yml          # Desenvolvimento
├── docker-compose.prod.yml     # Produção
├── .env.example
├── .gitignore
└── README.md
```

## 🔌 API Endpoints

### Cryptocurrencies

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/cryptos/` | Listar criptomoedas |
| POST | `/api/cryptos/` | Criar criptomoeda |
| GET | `/api/cryptos/{id}/` | Detalhes da criptomoeda |
| PUT | `/api/cryptos/{id}/` | Atualizar criptomoeda |
| DELETE | `/api/cryptos/{id}/` | Remover criptomoeda |
| POST | `/api/cryptos/{id}/refresh/` | Atualizar preço manualmente |
| GET | `/api/cryptos/{id}/history/` | Histórico de preços |

### Price History

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/prices/` | Listar histórico de preços |
| GET | `/api/prices/?crypto=1&hours=24` | Filtrar por crypto e período |

### Alerts

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/alerts/` | Listar alertas |
| POST | `/api/alerts/` | Criar alerta |
| GET | `/api/alerts/{id}/` | Detalhes do alerta |
| PUT | `/api/alerts/{id}/` | Atualizar alerta |
| DELETE | `/api/alerts/{id}/` | Remover alerta |
| POST | `/api/alerts/{id}/reset/` | Reativar alerta disparado |

### Dashboard & Utilities

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/dashboard/` | Estatísticas do dashboard |
| POST | `/api/fetch/` | Disparar coleta manual |
| GET | `/api/logs/` | Logs de coleta |
| GET | `/health/` | Health check |

## 🧪 Testes

```bash
# Backend
docker-compose exec backend pytest -v

# Com cobertura
docker-compose exec backend pytest --cov=core --cov-report=html

# Frontend
docker-compose exec frontend npm run lint
docker-compose exec frontend npm run type-check
```

## 📊 Modelagem de Dados

### Cryptocurrency
```python
- id: int (PK)
- symbol: str (unique, ex: "BTC")
- name: str (ex: "Bitcoin")
- coingecko_id: str (unique)
- image_url: str (nullable)
- is_active: bool
- created_at: datetime
- updated_at: datetime
```

### PriceHistory
```python
- id: int (PK)
- cryptocurrency: FK -> Cryptocurrency
- price_usd: Decimal(24, 8)
- price_brl: Decimal(24, 2)
- market_cap_usd: Decimal (nullable)
- volume_24h_usd: Decimal (nullable)
- change_1h: Decimal (nullable)
- change_24h: Decimal (nullable)
- change_7d: Decimal (nullable)
- collected_at: datetime (indexed)
```

### PriceAlert
```python
- id: int (PK)
- cryptocurrency: FK -> Cryptocurrency
- target_price: Decimal(24, 8)
- condition: enum ('above', 'below')
- note: text
- is_active: bool
- is_triggered: bool
- triggered_price: Decimal (nullable)
- triggered_at: datetime (nullable)
- created_at: datetime
```

## ⚙️ Celery Tasks

| Task | Schedule | Descrição |
|------|----------|-----------|
| `fetch_crypto_prices` | A cada 5 min | Coleta preços de todas as cryptos ativas |
| `check_price_alerts` | A cada 1 min | Verifica alertas ativos |
| `cleanup_old_price_history` | Diário 3:00 | Remove histórico > 30 dias |

## 🔧 Desenvolvimento Local (sem Docker)

### Backend

```bash
cd backend

# Criar virtualenv
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Instalar dependências
pip install -r requirements.txt

# Configurar variáveis de ambiente
export DEBUG=True
export SECRET_KEY=dev-secret-key
export POSTGRES_DB=crypto_monitor
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=postgres
export POSTGRES_HOST=localhost
export CELERY_BROKER_URL=amqp://guest:guest@localhost:5672//

# Migrations
python manage.py migrate
python manage.py seed_cryptos

# Rodar servidor
python manage.py runserver

# Em outro terminal - Celery Worker
celery -A config worker -l info

# Em outro terminal - Celery Beat
celery -A config beat -l info
```

### Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Rodar dev server
npm run dev
```

## 🚢 Deploy (Produção)

```bash
# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com valores de produção

# Build e iniciar
docker-compose -f docker-compose.prod.yml up -d --build

# Verificar logs
docker-compose -f docker-compose.prod.yml logs -f
```

## 📝 Licença

MIT License

## 👨‍💻 Autor

Bruno Lindquist - Desenvolvedor Python

---

**Projeto desenvolvido para demonstrar proficiência em:**
- Python/Django (Backend)
- Celery/RabbitMQ (Processamento assíncrono)
- React/TypeScript (Frontend)
- PostgreSQL (Banco de dados)
- Docker (Containerização)
- CI/CD (GitHub Actions)
