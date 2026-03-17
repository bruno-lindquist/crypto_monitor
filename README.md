# 🪙 Crypto Monitor

Um **sistema completo de monitoramento de preços de criptomoedas em tempo real**, com coleta automatizada, histórico de preços, gráficos interativos e sistema de alertas personalizados.

**Este é um projeto de estudos que demonstra boas práticas de desenvolvimento full-stack moderno.**

---

## 📖 Índice

1. [O que é este projeto?](#inicio)
2. [O que este Projeto Faz](#o-que-este-projeto-faz)
3. [Tecnologias Utilizadas](#tecnologias-utilizadas)
4. [Arquitetura do Sistema](#arquitetura-do-sistema)
5. [Começando Rapidamente (Docker)](#começando-rapidamente-docker)
6. [Instalação Sem Docker](#instalação-sem-docker)
7. [Uso do Sistema](#uso-do-sistema)
8. [Estrutura de Pastas e Arquivos](#estrutura-de-pastas-e-arquivos)
9. [Modelos de Dados](#modelos-de-dados)
10. [Endpoints da API](#endpoints-da-api)
11. [Tarefas Automáticas (Celery)](#tarefas-automáticas-celery)
12. [Testes](#testes)

---

## Ínicio

### O que é este projeto?

Este é um **sistema web completo** (frontend e backend) que monitora preços de criptomoedas. Ele funciona assim:

1. **Coleta automática**: A cada 1 minuto, o sistema busca os preços mais recentes de 20 criptomoedas pela API CoinGecko
2. **Armazena no banco**: Todos esses dados são salvos no banco de dados PostgreSQL
3. **Mostra em tempo real**: O navegador exibe os dados em gráficos, cards e tabelas
4. **Alertas automáticos**: Você pode criar alertas como "me avise quando o Bitcoin passar de $50.000"

### Como é organizado?

```
┌─────────────────────────────────────────────────────────────────┐
│                    VOCÊ AQUI (seu navegador)                    │
│                                                                 │
│  Frontend React + TypeScript                                    │
│  (Exibe gráficos, cards, alertas)                               │
│  http://localhost:3000                                          │
└─────────────────────────────────────────────────────────────────┘
                              ↕
                         (INTERNET)
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                  SERVIDOR BACKEND (computador)                  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Django REST API                                         │   │
│  │  (Recebe pedidos do frontend e devolve dados)            │   │
│  │  http://localhost:8000/api/                              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↕                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  PostgreSQL (Banco de Dados)                             │   │
│  │  (Guarda todos os preços, alertas, usuários)             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Celery Worker (Tarefas de Fundo)                        │   │
│  │  (A cada 1 minuto busca preços da CoinGecko)             │   │
│  │  (Verifica alertas, limpa dados antigos)                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↕                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  RabbitMQ (Gerenciador de Filas)                         │   │
│  │  (Coordena as tarefas de fundo)                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↕                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  CoinGecko API (Externo)                                 │   │
│  │  (Fonte dos preços em tempo real)                        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## O que este Projeto Faz

✅ **Coleta de preços**: Busca automaticamente preços de 20 criptomoedas a cada 1 minuto  
✅ **Histórico**: Armazena todos os preços no banco de dados  
✅ **Dashboard**: Exibe uma página inicial com resumo dos principais dados  
✅ **Lista de Criptos**: Mostra todas as criptomoedas com seus preços atuais  
✅ **Detalhes**: Para cada cripto, mostra um gráfico com histórico de 24 horas  
✅ **Alertas**: Você pode criar alertas como "me avise quando Bitcoin sair de X reais"  
✅ **Painel Admin**: Gerencia tudo pelo Django Admin (usuários, criptos, alertas)  

---

## Tecnologias Utilizadas

### Backend (Servidor)

| Tecnologia | O que é | Para que serve |
|---|---|---|
| **Python 3.11** | Linguagem de programação | Base de toda a lógica do servidor |
| **Django 4.2** | Framework web em Python | Cria a estrutura principal (URLs, banco de dados, admin) |
| **Django REST Framework** | Extensão do Django | Transforma os dados do banco em APIs JSON (o que o frontend consome) |
| **Celery** | Processador de tarefas de fundo | Executa coleta de preços e verificação de alertas a cada minuto |
| **RabbitMQ** | Gerenciador de filas | Coordena quais tarefas o Celery vai executar e em que ordem |
| **PostgreSQL 15** | Banco de dados relacional | Armazena todas as informações (preços, alertas, usuários) |
| **Gunicorn** | Servidor WSGI | Roda a aplicação Django em produção |

### Frontend (Interface Web)

| Tecnologia | O que é | Para que serve |
|---|---|---|
| **React 18** | Biblioteca JavaScript | Cria a interface web interativa |
| **TypeScript** | Extensão do JavaScript | Adiciona tipagem para evitar erros |
| **Vite** | Ferramenta de build | Compila o código e oferece um servidor de desenvolvimento rápido |
| **Tailwind CSS** | Framework CSS | Estiliza a interface com classes prontas |
| **Recharts** | Biblioteca de gráficos | Cria gráficos interativos dos preços |
| **React Router** | Navegação | Permite navegar entre páginas sem recarregar |

### Infraestrutura

| Tecnologia | O que é | Para que serve |
|---|---|---|
| **Docker** | Containerização | Empacota tudo (banco, server, frontend) em "caixas" isoladas |
| **Docker Compose** | Orquestração | Inicia todos os containers com um comando |
| **Nginx** | Servidor web | Em produção, serve o frontend e direciona requisições para a API |

---

## Arquitetura do Sistema

### Fluxo de Dados Principal

```
1. A cada 60 segundos:
   ├─ Celery Beat "acorda" e agendada uma tarefa
   │
2. Celery Worker pega a tarefa da fila RabbitMQ:
   ├─ Conecta na API CoinGecko
   ├─ Baixa os preços de BTC, ETH, USDT, etc.
   │
3. Salva os preços no PostgreSQL:
   ├─ Tabela: price_history
   ├─ Cada linha: 1 crypto, 1 preço, 1 horário
   │
4. Verifica alertas (a cada 60 segundos também):
   ├─ Se BTC sair de X, marca como "disparado"
   │
5. Frontend pede dados via API:
   ├─ GET /api/cryptos/ → lista todas
   ├─ GET /api/cryptos/1/history/?hours=24 → histórico de 24h
   │
6. Frontend exibe em tempo real:
   ├─ Gráficos atualizam a cada fetch
   ├─ Cards mostram preço atual
   ├─ Alertas aparecem quando disparam
```

### Componentes Principais

**Backend:**
- `config/`: Configurações globais do projeto
- `core/`: Aplicação principal com modelos, API e tarefas

**Frontend:**
- `pages/`: Páginas do app (Dashboard, Lista, Detalhe, Alertas)
- `components/`: Componentes reutilizáveis (Cards, Gráficos, Formulários)
- `services/`: Cliente HTTP que faz requisições à API
- `hooks/`: Funções auxiliares para buscar dados e auto-atualizar

---

## Começando Rapidamente (Docker)

### Pré-requisitos

- **Docker**: [Instalar Docker](https://docs.docker.com/get-docker/)
- **Docker Compose**: Geralmente vem com Docker (verifique com `docker-compose --version`)
- **Git**: Para clonar o repositório

### Passos (Windows, Mac ou Linux)

```bash
# 1. Entre na pasta do projeto
cd /caminho/para/crypto_monitor

# 2. Inicie todos os serviços
docker-compose up -d

# 3. Aguarde 10-15 segundos para tudo inicializar
```

### Acessar o Sistema

- **Frontend (Interface Web)**: http://localhost:3000
- **API (Dados)**: http://localhost:8000/api/
- **Admin Django**: http://localhost:8000/admin/
- **RabbitMQ Management**: http://localhost:15672 (user: `guest`, pass: `guest`)
- **PostgreSQL**: localhost:5432 (user: `postgres`, pass: `postgres`)

### Criar Superusuário (Admin)

```bash
# Abra o terminal na pasta do projeto
docker-compose exec backend python manage.py createsuperuser

# Digite seu usuário, email e senha
# Depois acesse: http://localhost:8000/admin/
```

### Parar os Serviços

```bash
docker-compose down
```

---

## Instalação Sem Docker

Use esta opção se quiser rodar tudo localmente no seu computador.

### Pré-requisitos (Todos os SOs)

Instale manualmente:
- **Python 3.11**: [python.org](https://www.python.org/)
- **Node.js 18+**: [nodejs.org](https://nodejs.org/)
- **PostgreSQL 15**: [postgresql.org](https://www.postgresql.org/)
- **RabbitMQ**: [rabbitmq.com](https://www.rabbitmq.com/)

Verifique com:
```bash
python --version    # Deve ser 3.11+
node --version      # Deve ser 18+
psql --version      # PostgreSQL
```

### Instalação no Windows

#### 1. Backend

```powershell
# Abra PowerShell e entre na pasta do projeto
cd backend

# Crie ambiente virtual
python -m venv venv

# Ative o ambiente
.\venv\Scripts\activate

# Instale dependências
pip install -r requirements.txt

# Configure variáveis de ambiente (PowerShell)
$env:DEBUG = "True"
$env:SECRET_KEY = "dev-secret-key-mude-em-producao"
$env:POSTGRES_DB = "crypto_monitor"
$env:POSTGRES_USER = "postgres"
$env:POSTGRES_PASSWORD = "postgres"
$env:POSTGRES_HOST = "localhost"
$env:POSTGRES_PORT = "5432"
$env:CELERY_BROKER_URL = "amqp://guest:guest@localhost:5672//"

# Execute migrations (cria tabelas no banco)
python manage.py migrate

# Popula criptomoedas iniciais
python manage.py seed_cryptos

# Inicie o servidor
python manage.py runserver
```

O servidor rodará em: http://localhost:8000

#### 2. Celery Worker (em outro terminal PowerShell)

```powershell
cd backend
.\venv\Scripts\activate

celery -A config worker -l info
```

#### 3. Celery Beat (agendador) (em outro terminal PowerShell)

```powershell
cd backend
.\venv\Scripts\activate

celery -A config beat -l info
```

#### 4. Frontend (em outro terminal PowerShell)

```powershell
cd frontend

npm install

npm run dev
```

O frontend rodará em: http://localhost:3000

---

### Instalação no Mac

#### 1. Backend

```bash
# Entre na pasta do projeto
cd backend

# Crie ambiente virtual
python3 -m venv venv

# Ative o ambiente
source venv/bin/activate

# Instale dependências
pip install -r requirements.txt

# Configure variáveis de ambiente
export DEBUG=True
export SECRET_KEY=dev-secret-key-mude-em-producao
export POSTGRES_DB=crypto_monitor
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=postgres
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export CELERY_BROKER_URL=amqp://guest:guest@localhost:5672//

# Execute migrations
python manage.py migrate

# Popula criptomoedas
python manage.py seed_cryptos

# Inicie o servidor
python manage.py runserver
```

O servidor rodará em: http://localhost:8000

#### 2. Celery Worker (em outro terminal)

```bash
cd backend
source venv/bin/activate

celery -A config worker -l info
```

#### 3. Celery Beat (agendador) (em outro terminal)

```bash
cd backend
source venv/bin/activate

celery -A config beat -l info
```

#### 4. Frontend (em outro terminal)

```bash
cd frontend

npm install

npm run dev
```

O frontend rodará em: http://localhost:3000

---

## Uso do Sistema

### 1. Dashboard

- **URL**: http://localhost:3000
- **O que mostra**: Resumo dos preços atuais de criptos principais
- **Dados**: Preço em USD e BRL, variação de 1h/24h/7d

### 2. Lista de Criptomoedas

- **URL**: http://localhost:3000/cryptos
- **O que mostra**: Tabela com todas as criptos monitoradas
- **Ações**: Clique em uma cripto para ver detalhes

### 3. Detalhes de uma Cripto

- **URL**: http://localhost:3000/cryptos/:id
- **O que mostra**: Gráfico com histórico de 24 horas
- **Dados**: Preço, volume, market cap, mudanças percentuais

### 4. Gerenciador de Alertas

- **URL**: http://localhost:3000/alerts
- **O que faz**: Cria alertas como "me avise quando Bitcoin sair de X"
- **Condições**: Pode ser "acima de" ou "abaixo de"
- **Disparo**: Quando o preço atinge o alvo, o alerta é marcado como "disparado"

### 5. Painel Admin Django

- **URL**: http://localhost:8000/admin/
- **Login**: Use as credenciais do superusuário que você criou
- **O que gerencia**:
  - Usuários e permissões
  - Criptomoedas (ativar/desativar)
  - Alertas (ver todos os alertas)
  - Logs de coleta

---

## Estrutura de Pastas e Arquivos

### Raiz do Projeto

```
crypto_monitor/
├── docker-compose.yml              # Inicia tudo em desenvolvimento
├── docker-compose.prod.yml         # Versão para produção
├── README.md                        # Este arquivo
├── backend/                         # Servidor Django
└── frontend/                        # Interface React
```

### Backend (backend/)

#### Configurações e Entrada

```
config/
├── __init__.py                  # Inicializa Celery no Django
├── settings.py                  # Configurações do projeto (BD, Apps, Security)
├── urls.py                      # URLs principais (/admin, /api, /health)
├── wsgi.py                      # Entrada para servidor de produção (Gunicorn)
├── celery.py                    # Configura e agenda tarefas (a cada 1 min, etc)
```

**O que cada faz:**
- `settings.py`: Define qual banco usar, quais apps estão ativos, middleware
- `urls.py`: Define as rotas raiz (quando alguém acessa /admin, vai para admin Django)
- `celery.py`: Define que a cada 60s o Celery vai executar `fetch_crypto_prices`
- `wsgi.py`: É por onde o servidor de produção (Gunicorn) entra

#### Aplicação Principal (core/)

```
core/
├── __init__.py                  # Marca como pacote Python
├── apps.py                      # Configuração do app Django
├── models.py                    # Estrutura das tabelas no banco
├── serializers.py               # Converte modelos para JSON (API)
├── views.py                     # Endpoints da API (GET /cryptos, POST /alerts)
├── urls.py                      # Rotas da API (/api/cryptos, /api/alerts)
├── tasks.py                     # Tarefas Celery (busca preços, verifica alertas)
├── admin.py                     # Painel Admin (o que aparece em /admin)
├── tests.py                     # Testes automatizados
├── management/
│   └── commands/
│       └── seed_cryptos.py      # Comando que popula 20 criptos iniciais
└── migrations/
    ├── __init__.py              # Marca como pacote
    └── 0001_initial.py          # Primeira migração (cria tabelas)
```

**Entendendo cada arquivo:**

- `models.py`: Define `Cryptocurrency`, `PriceHistory`, `PriceAlert`, `CollectionLog`
- `serializers.py`: Diz como converter esses modelos para JSON que a API devolve
- `views.py`: Endpoints como `GET /api/cryptos/` → retorna lista de criptos
- `tasks.py`: Funções que o Celery executa (ex: `fetch_crypto_prices()`)
- `admin.py`: O que você vê quando faz login em `/admin/`

#### Outros Arquivos Backend

```
backend/
├── manage.py                    # Script principal do Django
├── requirements.txt             # Lista de dependências Python
├── pytest.ini                   # Opções do pytest
└── Dockerfile                   # Cria imagem Docker do backend
```

- `manage.py`: Você usa assim: `python manage.py migrate`, `python manage.py runserver`
- `requirements.txt`: Arquivo de texto com `django==4.2`, `celery==5.3`, etc
- `Dockerfile`: Receita para criar um container com tudo instalado

---

### Frontend (frontend/)

#### Configuração

```
frontend/
├── package.json                 # Dependências JavaScript
├── package-lock.json            # Lock file (versões exatas)
├── vite.config.ts               # Configura Vite (proxy para /api)
├── tsconfig.json                # Configuração TypeScript
├── tailwind.config.js           # Cores e temas do Tailwind
├── postcss.config.js            # Processa CSS (Tailwind)
├── index.html                   # HTML base (carrega React aqui)
├── Dockerfile.dev               # Dockerfile para desenvolvimento
├── Dockerfile                   # Dockerfile para produção
└── nginx.conf                   # Config Nginx (produção)
```

#### Código da Aplicação (src/)

```
src/
├── main.tsx                     # Ponto de entrada (inicializa React)
├── App.tsx                      # Rotas principais (Dashboard, List, Detail, Alerts)
├── vite-env.d.ts                # Tipos do Vite
├── index.css                    # Estilos globais
├── types/
│   └── index.ts                 # Tipos TypeScript (Crypto, Alert, etc)
├── services/
│   └── api.ts                   # Cliente HTTP (faz requisições à API)
├── hooks/
│   └── useFetch.ts              # Hook para carregar dados com loading/erro
├── utils/
│   ├── format.ts                # Funções auxiliares de formatação
│   └── poll.ts                  # Polling assíncrono reutilizável
├── components/                  # Componentes reutilizáveis
│   ├── Layout.tsx               # Header e navegação
│   ├── CryptoCard.tsx           # Card com info de 1 crypto
│   ├── StatCard.tsx             # Card com estatísticas
│   ├── PriceChart.tsx           # Gráfico (Recharts)
│   ├── AlertForm.tsx            # Modal para criar alertas
│   └── LoadingSpinner.tsx        # Spinner de carregamento
└── pages/                       # Páginas completas
    ├── Dashboard.tsx            # Página inicial
    ├── CryptoList.tsx           # Lista de criptos
    ├── CryptoDetail.tsx         # Detalhe de 1 crypto
    └── Alerts.tsx               # Gerenciador de alertas
```

**Entendendo:**

- `App.tsx`: Define as rotas (URL `/` → Dashboard, URL `/cryptos` → CryptoList)
- `services/api.ts`: Cliente HTTP centralizado para as chamadas da API
- `pages/`: Cada arquivo é uma página da web
- `components/`: Blocos reutilizáveis (um card pode aparecer em vários lugares)

---

## Modelos de Dados

### Cryptocurrency

Representa uma moeda que estamos monitorando.

```
╔═══════════════════════════════════╗
║       Cryptocurrency              ║
╠═══════════════════════════════════╣
║ id (chave primária)               ║
║ symbol: "BTC", "ETH", etc         ║
║ name: "Bitcoin", "Ethereum"       ║
║ coingecko_id: "bitcoin"           ║
║ image_url: URL da logo            ║
║ is_active: true/false             ║
║ created_at: quando foi criado     ║
║ updated_at: última atualização    ║
╚═══════════════════════════════════╝
```

### PriceHistory

Cada linha é um "snapshot" do preço de uma crypto em um momento.

```
╔═══════════════════════════════════╗
║       PriceHistory                ║
╠═══════════════════════════════════╣
║ id (chave primária)               ║
║ cryptocurrency_id (FK)            ║ → Qual crypto é?
║ price_usd: 45000.50               ║
║ price_brl: 234000.80              ║
║ market_cap_usd: 1000000000000     ║
║ volume_24h_usd: 50000000000       ║
║ change_1h: -0.5%                  ║
║ change_24h: +2.3%                 ║
║ change_7d: -10.2%                 ║
║ collected_at: 2026-01-26 13:45    ║ ← Quando foi coletado
╚═══════════════════════════════════╝
```

A tabela `PriceHistory` cresce rapidamente! Cada 1 minuto, 20 criptos = 20 novas linhas.
Depois de 30 dias, = 864.000 linhas (mas os dados antigos são deletados).

### PriceAlert

Um alerta que você cria.

```
╔═══════════════════════════════════╗
║       PriceAlert                  ║
╠═══════════════════════════════════╣
║ id (chave primária)               ║
║ cryptocurrency_id (FK)            ║ → Qual crypto?
║ target_price: 50000               ║ → Em quanto?
║ condition: "above" ou "below"     ║ → Acima ou abaixo?
║ is_active: true/false             ║ → Está ligado?
║ triggered: true/false             ║ → Já disparou?
║ triggered_at: data/hora           ║ → Quando disparou?
║ created_at: 2026-01-26            ║
╚═══════════════════════════════════╝

Exemplo:
- Bitcoin, target 50000, "above" 
  → Avisa quando Bitcoin sair acima de $50.000
```

### CollectionLog

Registro de cada coleta de preços (para auditoria).

```
╔═══════════════════════════════════╗
║       CollectionLog               ║
╠═══════════════════════════════════╣
║ id (chave primária)               ║
║ status: "success", "error"        ║
║ processed_count: 20               ║ → Quantas criptos?
║ duration: 2.5                     ║ → Quanto tempo?
║ error_message: null ou texto      ║ → Houve erro?
║ collected_at: 2026-01-26 13:45    ║
╚═══════════════════════════════════╝
```

---

## Endpoints da API

A API expõe endpoints (URLs) que o frontend consome.

### Criptomoedas

```bash
# Listar todas
GET /api/cryptos/
Resposta: [
  { "id": 1, "symbol": "BTC", "name": "Bitcoin", "price_usd": 45000 },
  { "id": 2, "symbol": "ETH", "name": "Ethereum", "price_usd": 2500 },
  ...
]

# Detalhe de 1
GET /api/cryptos/1/
Resposta: { "id": 1, "symbol": "BTC", "name": "Bitcoin", ... }

# Histórico de preços de 24 horas
GET /api/cryptos/1/history/?hours=24
Resposta: [
  { "price_usd": 45000, "price_brl": 234000, "collected_at": "2026-01-26T13:45:00Z" },
  { "price_usd": 45100, "price_brl": 234500, "collected_at": "2026-01-26T13:46:00Z" },
  ...
]

# Forçar coleta de preços agora (não espera 1 minuto)
POST /api/cryptos/1/refresh/
Resposta: { "status": "collecting" }
```

### Alertas

```bash
# Listar todos os alertas
GET /api/alerts/
Resposta: [
  { 
    "id": 1, 
    "cryptocurrency": "BTC", 
    "target_price": 50000, 
    "condition": "above",
    "triggered": false 
  },
  ...
]

# Criar um alerta
POST /api/alerts/
Body: {
  "cryptocurrency_id": 1,
  "target_price": 50000,
  "condition": "above"
}
Resposta: { "id": 1, "cryptocurrency": "BTC", ... }

# Atualizar um alerta
PATCH /api/alerts/1/
Body: { "is_active": false }

# Deletar um alerta
DELETE /api/alerts/1/

# Resetar um alerta disparado
POST /api/alerts/1/reset/
Resposta: { "triggered": false }
```

### Outros

```bash
# Verificar se o servidor está vivo
GET /health/
Resposta: { "status": "healthy", "service": "crypto-monitor-api" }

# Dashboard (resumo)
GET /api/dashboard/
Resposta: {
  "total_cryptos": 20,
  "total_alerts": 5,
  "active_alerts": 3,
  "latest_prices": [...]
}
```

---

## Tarefas Automáticas (Celery)

Celery executa tarefas em segundo plano, sem bloquear o servidor.

### O que acontece a cada 60 segundos?

```
┌─ Celery Beat ──────────────────────┐
│ A cada 60 segundos:                │
│  ├─ Agenda: "fetch_crypto_prices"  │
│  └─ Agenda: "check_price_alerts"   │
└────────────────────────────────────┘
           ↓
┌─ RabbitMQ (Fila) ──────────────────┐
│ Tarefas agendadas ficam aqui       │
└────────────────────────────────────┘
           ↓
┌─ Celery Worker ────────────────────┐
│ Pega tarefa e executa              │
│                                    │
│ fetch_crypto_prices():             │
│  1. Conecta em CoinGecko           │
│  2. Busca preços de BTC, ETH...    │
│  3. Salva no PostgreSQL            │
│  4. Marca como concluída           │
│                                    │
│ check_price_alerts():              │
│  1. Pega todos os alertas ativos   │
│  2. Compara com preço atual        │
│  3. Se atingiu alvo, dispara       │
│  4. Envia notificação              │
└────────────────────────────────────┘
           ↓
┌─ PostgreSQL ───────────────────────┐
│ Dados salvos com sucesso           │
└────────────────────────────────────┘
```

### Agendamentos (definidos em `backend/config/celery.py`)

```python
app.conf.beat_schedule = {
    "fetch-crypto-prices-every-minute": {
        "task": "core.tasks.fetch_crypto_prices",
        "schedule": 60.0,  # A cada 60 segundos
    },
    "check-price-alerts-every-minute": {
        "task": "core.tasks.check_price_alerts",
        "schedule": 60.0,  # A cada 60 segundos
    },
    "cleanup-old-price-history-daily": {
        "task": "core.tasks.cleanup_old_price_history",
        "schedule": crontab(hour=3, minute=0),  # Todos os dias às 3:00 AM
    },
}
```

**O que cada faz:**

1. **fetch_crypto_prices**: Busca os preços atuais na CoinGecko e salva
2. **check_price_alerts**: Verifica se algum alerta foi acionado
3. **cleanup_old_price_history**: Deleta dados com mais de 30 dias (economiza espaço)

---

## Testes

O projeto tem testes automatizados para garantir que tudo funciona.

### Rodar os Testes

```bash
# Com Docker
docker-compose exec backend pytest -v

# Sem Docker (no seu computador)
cd backend
source venv/bin/activate  # ou .\venv\Scripts\activate no Windows
pytest -v
```

**O que está sendo testado:**
- Modelos (Cryptocurrency, PriceHistory, etc.)
- Endpoints da API (GET, POST, etc.)
- Tarefas Celery (fetch, alerts, cleanup)
- Permissões (quem pode fazer o quê)

---

## Resumo Rápido de Tecnologias

### Por que usar cada uma?

| Tecnologia | Problema que resolve |
|---|---|
| **Django** | Sem framework, você precisaria criar URLs, banco, autenticação do zero |
| **REST Framework** | Sem ele, você manualmente converteria objetos Python para JSON |
| **Celery** | Sem ele, buscar preços a cada 1 min travaria o servidor (tudo seria sequencial) |
| **RabbitMQ** | Sem ele, não teria um gerenciador de filas confiável |
| **PostgreSQL** | Banco robusto, confiável, com indices para buscas rápidas |
| **React** | Interface responsiva, atualiza sem recarregar, melhor UX |
| **TypeScript** | Sem ele, JavaScript deixa você cometer erros que só aparecem em produção |
| **Docker** | Sem ele, teria que instalar tudo manualmente (Python, BD, Node, RabbitMQ) |

---

## Dúvidas Frequentes

**P: Por que preciso do RabbitMQ?**  
R: Para coordenar tarefas de fundo. Se você tem 100 tarefas agendadas, RabbitMQ garante que todas sejam executadas na ordem correta.

**P: Por que Celery e não apenas um `setInterval` no JavaScript?**  
R: `setInterval` é frágil. Se o navegador fecha, as tarefas param. Celery roda no servidor, independente.

**P: Posso usar SQLite em vez de PostgreSQL?**  
R: Sim, mas PostgreSQL é mais robusto. SQLite é para teste, PostgreSQL para produção.

**P: Como escalo o projeto?**  
R: Com Docker, você pode rodar múltiplos workers Celery, múltiplas instâncias da API, e PostgreSQL com replicação.

---

## Créditos

Projeto de estudos desenvolvido como exemplo de arquitetura full-stack moderna.

**Tecnologias principais:** Python, Django, React, TypeScript, Docker, PostgreSQL, Celery
