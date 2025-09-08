# Meet Backend - LiveKit Server met SSO

Deze Go backend biedt LiveKit server functionaliteit met Single Sign-On (SSO) integratie voor id.lazentis.com.

## Features

- 🔐 SSO integratie met id.lazentis.com
- 🎥 LiveKit room management
- 🎬 Recording functionaliteit
- 👥 Participant management
- 🔑 JWT token authenticatie
- 🐳 Docker support

## Vereisten

- Go 1.21 of hoger
- Docker en Docker Compose (optioneel)
- LiveKit server (wordt automatisch opgestart met Docker Compose)

## Installatie

### 1. Environment Configuratie

Kopieer het voorbeeld environment bestand:

```bash
cp .env.example .env
```

Vul de volgende variabelen in:

```env
# LiveKit Configuration
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_URL=ws://localhost:7880

# SSO Configuration voor id.lazentis.com
SSO_CLIENT_ID=your_sso_client_id
SSO_CLIENT_SECRET=your_sso_client_secret
SSO_REDIRECT_URL=http://localhost:8080/auth/callback
SSO_ISSUER_URL=https://id.lazentis.com

# Server Configuration
PORT=8080
```

### 2. Dependencies Installeren

```bash
go mod tidy
```

### 3. Applicatie Builden

```bash
# Met Makefile (aanbevolen)
make build

# Of direct met Go
go build -o meet-backend ./cmd/server
```

### 4. Server Starten

#### Optie A: Development mode
```bash
make dev
# Of direct: go run ./cmd/server
```

#### Optie B: Build en run
```bash
make run
```

#### Optie C: Direct starten van binary
```bash
# Na make build:
./meet-backend      # Linux/Mac
meet-backend.exe    # Windows
```

#### Optie D: Met Docker Compose (Aanbevolen)
```bash
docker-compose up -d
```

Dit start automatisch:
- LiveKit server op poort 7880
- Redis voor LiveKit scaling
- Meet Backend API op poort 8080

## API Endpoints

### Authenticatie
- `GET /auth/login` - Start SSO login flow
- `GET /auth/callback` - OAuth callback handler
- `POST /auth/refresh` - Refresh JWT token

### Room Management (Authenticatie vereist)
- `POST /api/rooms/{roomName}/token` - Genereer room access token
- `GET /api/rooms/{roomName}/participants` - Lijst van participants
- `DELETE /api/rooms/{roomName}/participants/{participantId}` - Verwijder participant

### Recording (Admin rechten vereist)
- `POST /api/rooms/{roomName}/recording/start` - Start recording
- `POST /api/rooms/{roomName}/recording/stop` - Stop recording

## SSO Configuratie

### id.lazentis.com Setup

1. Registreer een nieuwe OAuth2 applicatie in id.lazentis.com
2. Stel de redirect URL in: `http://localhost:8080/auth/callback` (of je productie URL)
3. Noteer de Client ID en Client Secret
4. Configureer de scopes: `openid`, `profile`, `email`

### Gebruikersgroepen

De applicatie ondersteunt de volgende groepen voor autorisatie:
- `admin` - Volledige toegang tot alle functies
- `meet-admin` - Room management en participant controle
- `recording` - Recording functionaliteit

## Development

### Lokale Development

1. Start LiveKit server:
```bash
livekit-server --dev
```

2. Start de backend:
```bash
# Development mode (met hot reload)
make dev

# Of direct:
go run ./cmd/server
```

### Testing

```bash
go test ./...
```

### Linting

```bash
golangci-lint run
```

## Deployment

### Docker

Build de Docker image:
```bash
docker build -t meet-backend .
```

Run de container:
```bash
docker run -p 8080:8080 --env-file .env meet-backend
```

### Kubernetes

Zie de `k8s/` directory voor Kubernetes deployment manifests.

## Troubleshooting

### Veelvoorkomende Problemen

1. **"LIVEKIT_URL is not defined"**
   - Controleer of alle environment variabelen correct zijn ingesteld

2. **"Authentication required"**
   - Zorg ervoor dat de SSO configuratie correct is
   - Controleer of de redirect URL overeenkomt

3. **"Failed to generate token"**
   - Controleer LiveKit server connectiviteit
   - Verifieer API key en secret

### Logs

Bekijk de logs voor debugging:
```bash
docker-compose logs -f meet-backend
```

## Beveiliging

- Alle API endpoints vereisen JWT authenticatie
- CORS is geconfigureerd voor frontend toegang
- Tokens hebben een beperkte levensduur (6 uur)
- Recording functionaliteit is beperkt tot geautoriseerde gebruikers

## Licentie

MIT License - zie LICENSE bestand voor details.
