# LiveKit Meet met Go Backend en SSO Setup

Deze setup biedt een complete LiveKit Meet applicatie met:
- Go backend voor LiveKit server management
- SSO integratie met id.lazentis.com
- Next.js frontend met authenticatie
- Docker deployment

## 🏗️ Architectuur

```
Frontend (Next.js) ←→ Go Backend ←→ LiveKit Server
                           ↓
                    id.lazentis.com (SSO)
```

## 🚀 Snelle Start

### 1. Backend Starten

```bash
cd backend
cp .env.example .env
# Vul je SSO credentials in
docker-compose up -d
```

### 2. Frontend Starten

```bash
cp .env.example .env.local
# Configureer backend URL
npm install
npm run dev
```

### 3. SSO Configureren

In id.lazentis.com:
- Client ID: `your_client_id`
- Client Secret: `your_client_secret`
- Redirect URL: `http://localhost:8080/auth/callback`
- Scopes: `openid profile email`

## 📁 Project Structuur

```
meet-v2/
├── app/                    # Next.js frontend
│   ├── api/               # API routes (proxy naar Go backend)
│   ├── auth/              # Authenticatie pagina's
│   ├── login/             # Login pagina
│   └── rooms/             # Room pagina's
├── backend/               # Go backend
│   ├── cmd/               # Applicatie entry points
│   │   └── server/        # Main server applicatie
│   │       └── main.go    # Server entry point
│   ├── internal/          # Interne packages
│   │   ├── auth/          # SSO authenticatie
│   │   ├── handlers/      # API handlers
│   │   ├── middleware/    # Middleware
│   │   └── models/        # Data modellen
│   ├── docker-compose.yml # Docker setup
│   ├── Dockerfile         # Backend container
│   ├── Makefile          # Build commando's
│   └── livekit.yaml       # LiveKit configuratie
└── lib/                   # Gedeelde frontend code
    ├── api-client.ts      # Backend API client
    └── auth-context.tsx   # React authenticatie context
```

## 🔧 Configuratie

### Backend Environment (.env)

```env
# LiveKit
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
LIVEKIT_URL=ws://localhost:7880

# SSO
SSO_CLIENT_ID=your_client_id
SSO_CLIENT_SECRET=your_client_secret
SSO_REDIRECT_URL=http://localhost:8080/auth/callback
SSO_ISSUER_URL=https://id.lazentis.com

# Server
PORT=8080
```

### Frontend Environment (.env.local)

```env
BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_SHOW_SETTINGS_MENU=true
```

## 🔐 Authenticatie Flow

1. Gebruiker bezoekt `/login`
2. Redirect naar `id.lazentis.com` voor SSO
3. Na succesvolle authenticatie: redirect naar `/auth/callback`
4. Backend genereert JWT token
5. Frontend slaat token op en redirect naar gewenste pagina
6. API calls gebruiken JWT token voor autorisatie

## 🎥 LiveKit Features

### Room Management
- Automatische room creatie
- Participant management
- Token generatie met juiste permissions

### Recording
- Start/stop recording (admin rechten vereist)
- S3 storage support
- Webhook notificaties

### Permissions
- `admin`: Volledige toegang
- `meet-admin`: Room management
- `recording`: Recording functionaliteit

## 🐳 Docker Deployment

De `docker-compose.yml` start automatisch:
- LiveKit server (poort 7880)
- Redis voor scaling
- Go backend API (poort 8080)

```bash
cd backend
docker-compose up -d
```

## 🔍 API Endpoints

### Authenticatie
- `GET /auth/login` - Start SSO flow
- `GET /auth/callback` - OAuth callback
- `POST /auth/refresh` - Token refresh

### Rooms (Authenticatie vereist)
- `POST /api/rooms/{room}/token` - Genereer access token
- `GET /api/rooms/{room}/participants` - Lijst participants
- `DELETE /api/rooms/{room}/participants/{id}` - Verwijder participant

### Recording (Admin rechten)
- `POST /api/rooms/{room}/recording/start` - Start recording
- `POST /api/rooms/{room}/recording/stop` - Stop recording

## 🛠️ Development

### Backend Development
```bash
cd backend
# Development mode
make dev
# Of direct:
go run ./cmd/server
```

### Frontend Development
```bash
npm run dev
```

### Testing
```bash
# Backend
cd backend && go test ./...

# Frontend
npm test
```

## 🚨 Troubleshooting

### Veelvoorkomende Problemen

1. **SSO redirect werkt niet**
   - Controleer redirect URL in id.lazentis.com
   - Verifieer client credentials

2. **LiveKit connectie mislukt**
   - Controleer of LiveKit server draait op poort 7880
   - Verifieer API key/secret

3. **JWT token expired**
   - Tokens zijn 6 uur geldig
   - Refresh token wordt automatisch gebruikt

### Logs Bekijken
```bash
# Backend logs
docker-compose logs -f meet-backend

# LiveKit logs
docker-compose logs -f livekit
```

## 📈 Productie Deployment

Voor productie deployment:

1. Update environment variabelen voor productie URLs
2. Configureer HTTPS/SSL certificaten
3. Setup load balancing voor LiveKit
4. Configureer monitoring en logging
5. Setup backup voor recordings

## 🔒 Beveiliging

- Alle API endpoints vereisen JWT authenticatie
- CORS geconfigureerd voor frontend toegang
- Tokens hebben beperkte levensduur
- Recording beperkt tot geautoriseerde gebruikers
- SSO integratie voor centraal gebruikersbeheer

## 📞 Support

Voor vragen over de setup:
1. Controleer de logs voor error messages
2. Verifieer alle environment variabelen
3. Test SSO configuratie apart
4. Controleer LiveKit server status

De applicatie is nu klaar voor gebruik met volledige SSO integratie en LiveKit functionaliteit!
