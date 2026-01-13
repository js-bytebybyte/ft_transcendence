# 🎮 ft_transcendence

A full-stack web application for playing Pong online with real-time multiplayer features, tournaments, and social interactions. This is the 42 School Grand Final Project.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Setup](#setup)
- [Running the Project](#running-the-project)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Architecture](#architecture)
- [Environment Variables](#environment-variables)
- [Development](#development)
- [Docker](#docker)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

**ft_transcendence** is a comprehensive web-based platform that allows users to:
- Play Pong games in real-time against other players
- Participate in tournament competitions
- Chat with other users
- Manage friendships and user profiles
- View game statistics and leaderboards
- Support for AI opponents
- Two-factor authentication for security

Built with modern web technologies, the application features a responsive frontend and a robust backend with WebSocket support for real-time interactions.

## ✨ Features

### Core Gameplay
- **Pong Game**: Classic Pong implementation with real-time synchronization
- **Multiplayer**: Real-time player vs player games
- **AI Opponent**: Play against an AI with customizable difficulty
- **Game Loop**: Server-side game state management with client-side rendering
- **Match History**: Track all games played with detailed statistics

### Tournaments
- **Tournament System**: Create and manage tournament brackets
- **Round-based Matches**: Automatic progression through tournament rounds
- **Leaderboard**: Track tournament wins and player rankings
- **Tournament History**: View past tournament results

### Social Features
- **User Profiles**: Customizable user profiles with avatars
- **Friend System**: Add/remove friends and manage friendships
- **Real-time Chat**: WebSocket-powered direct messaging between users
- **Chatbot Integration**: AI-powered chat bot for user interaction
- **Online Status**: See who's online in real-time

### Authentication & Security
- **JWT Authentication**: Secure token-based authentication
- **Two-Factor Authentication (2FA)**: Optional 2FA for enhanced security
- **OAuth2 Integration**: Third-party authentication support
- **Password Hashing**: bcrypt for secure password storage
- **HTTPS**: All communications encrypted with SSL/TLS

### User Experience
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Updates**: WebSocket connections for live data
- **File Uploads**: Avatar and asset management
- **Email Notifications**: Optional email-based features (remember me)

## 🛠️ Tech Stack

### Frontend
- **TypeScript**: Type-safe JavaScript development
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **Vanilla JavaScript**: No framework dependencies for lightweight solution
- **WebSocket**: Real-time bidirectional communication

### Backend
- **Node.js**: JavaScript runtime
- **Fastify**: Fast and low-overhead web framework
- **TypeScript**: Type-safe backend code
- **SQLite3**: Lightweight relational database
- **Nodemailer**: Email service integration
- **bcrypt**: Password hashing and security
- **JWT**: Secure authentication tokens

### DevOps & Tools
- **Docker**: Containerization
- **Docker Compose**: Multi-container orchestration
- **PM2**: Process manager for production
- **npm**: Package management

## 📋 Prerequisites

- **Node.js**: v22 or higher
- **Docker**: Latest version
- **Docker Compose**: Latest version
- **OpenSSL**: For generating SSL certificates
- **.env file**: Configuration file with required environment variables
- **SSL Certificates**: Self-signed or CA-signed certificates in `certs/` directory

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/js-bytebybyte/ft_transcendence.git
cd ft_transcendence
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Generate SSL Certificates
The project requires HTTPS certificates. Generate self-signed certificates:
```bash
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -nodes -out certs/server.crt -keyout certs/server.key -days 365
```

### 4. Create Environment File
Create a `.env` file in the root directory with required variables:
```bash
# Database
DB_PATH=./db/transcendence.db

# Server
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# Email Service (Optional)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_REMEMBER=your-email@gmail.com

# JWT
JWTS=your-super-secret-jwt-key

# OAuth2 (Optional)
CLIENT_ID=your-oauth-client-id
CLIENT_SECRET=your-oauth-client-secret
```

## ⚙️ Setup

The project includes an automated setup script:

```bash
./setup.sh
```

This script will:
- Create symbolic links to the `.env` file
- Create symbolic links to the `certs/` directory
- Install the `dotenv` package

## 🏃 Running the Project

### Development Mode
```bash
npm run dev
```

This will:
- Run the setup script
- Start Docker containers with volume mounts for hot-reloading
- Frontend: `https://localhost:3001`
- Backend API: `https://localhost:3000`

### Rebuild Development Mode
```bash
npm run redev
```

### Production Mode
```bash
npm run prod
```

### Rebuild Production Mode
```bash
npm run reprod
```

### Vite Dev Server (Frontend only)
```bash
npm run vite:dev
```

### CLI Pong Game
Test the game via command line:
```bash
npm run cli
```

## 📁 Project Structure

```
ft_transcendence/
├── src/
│   ├── backend/
│   │   ├── server.ts                 # Main server entry point
│   │   ├── db/                       # Database files
│   │   └── src/
│   │       ├── database.ts           # Database initialization
│   │       ├── Routes/
│   │       │   ├── userRoutes.ts     # User management endpoints
│   │       │   ├── pongRoutes.ts     # Game endpoints
│   │       │   ├── MessagingRoutes.ts# Chat endpoints
│   │       │   ├── pongGameLoop.ts   # Game loop logic
│   │       │   ├── pongGameState.ts  # Game state management
│   │       │   ├── pongConstants.ts  # Game constants
│   │       │   └── uploads/          # File uploads directory
│   │       └── services/
│   │           ├── userService.ts    # User business logic
│   │           ├── messagingService.ts # Chat service
│   │           ├── FriendShipService.ts # Friend management
│   │           ├── TournamentService.ts # Tournament logic
│   │           └── EmailService.ts   # Email handling
│   └── frontend/
│       ├── index.html                # HTML entry point
│       ├── server.ts                 # Frontend dev server
│       ├── cliPong.js                # CLI game interface
│       └── src/
│           ├── main.ts               # Application bootstrap
│           ├── app.ts                # App initialization
│           ├── router.ts             # Route management
│           ├── utils.ts              # Utility functions
│           ├── API/
│           │   ├── api.ts            # HTTP API client
│           │   ├── auth.ts           # Authentication API
│           │   ├── mysocket.ts       # WebSocket management
│           └── pages/
│               ├── renderHomePage.ts
│               ├── renderLoginPage.ts
│               ├── renderRegisterPage.ts
│               ├── renderGamePage.ts
│               ├── renderTournamentPage.ts
│               ├── renderTournamentRound.ts
│               ├── renderProfilPage.ts
│               ├── renderChatBox.ts
│               ├── renderFriendList.ts
│               ├── renderSettings.ts
│               ├── renderNavBar.ts
│               ├── renderNotFound.ts
│               └── renderTwoFaBox.ts
│           └── styles/
│               ├── input.css
│               └── output.css (generated)
├── Dockerfile                        # Docker image definition
├── docker-compose.yml                # Multi-container setup
├── ecosystem.config.cjs              # PM2 configuration
├── package.json                      # Dependencies & scripts
├── tsconfig.json                     # TypeScript configuration
└── README.md                         # This file
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/2fa` - Two-factor authentication
- `GET /api/auth/oauth` - OAuth2 authentication

### User Management
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update user profile
- `GET /api/users/:id/stats` - Get user statistics
- `PUT /api/users/:id/avatar` - Upload avatar

### Game/Pong
- `POST /api/game/create` - Create new game
- `GET /api/game/:id` - Get game status
- `POST /api/game/:id/move` - Send game input
- `GET /api/game/history` - Get match history
- `GET /api/leaderboard` - Get player rankings

### Tournaments
- `POST /api/tournament/create` - Create tournament
- `GET /api/tournament/:id` - Get tournament details
- `POST /api/tournament/:id/join` - Join tournament
- `GET /api/tournament/:id/bracket` - Get bracket info
- `POST /api/tournament/:id/start` - Start tournament

### Friends
- `GET /api/friends` - Get friend list
- `POST /api/friends/:id/add` - Add friend
- `DELETE /api/friends/:id` - Remove friend
- `GET /api/friends/:id/online-status` - Check online status

### Messaging
- `GET /api/messages/:userId` - Get conversations
- `POST /api/messages/:userId/send` - Send message
- `GET /api/messages/history/:conversationId` - Get message history
- `WS /api/messages/ws` - WebSocket connection

## 🏗️ Architecture

### Frontend Architecture
- **SPA (Single Page Application)**: Client-side routing without page reloads
- **Component-based**: Modular page components for different views
- **Real-time Updates**: WebSocket integration for live game and chat updates
- **Responsive UI**: Tailwind CSS for mobile and desktop compatibility

### Backend Architecture
- **RESTful API**: Standard HTTP endpoints for CRUD operations
- **WebSocket Server**: Real-time communication for games and messaging
- **Service Layer**: Business logic separated from route handlers
- **Database**: SQLite for persistence with relational schema

### Communication Flow
```
Client (Frontend) ←→ Server (Backend)
         ↓
    [Fastify + HTTPS]
         ↓
    [Routes & Services]
         ↓
    [SQLite Database]
```

**Real-time Communication**:
```
Client ←→ WebSocket ←→ Server ←→ Database
  (Game Updates)    (Pong Game Loop)
  (Chat Messages)   (Message Service)
  (Online Status)   (User Service)
```

## 🌍 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` or `production` |
| `PORT` | Backend server port | `3000` |
| `HOST` | Server host address | `0.0.0.0` |
| `DB_PATH` | SQLite database path | `./db/transcendence.db` |
| `JWTS` | JWT signing secret | `your-secret-key` |
| `EMAIL_USER` | Email service username | `your-email@gmail.com` |
| `EMAIL_PASS` | Email service password | `app-specific-password` |
| `EMAIL_REMEMBER` | Remember me email | `your-email@gmail.com` |
| `CLIENT_ID` | OAuth2 client ID | `your-client-id` |
| `CLIENT_SECRET` | OAuth2 client secret | `your-client-secret` |

## 💻 Development

### Available Scripts

```bash
# Development
npm run dev              # Start dev environment with Docker
npm run redev           # Rebuild and start dev environment
npm run vite:dev        # Vite dev server only

# Production
npm run prod            # Start production environment
npm run reprod          # Rebuild and start production

# Git Management
npm run me              # Checkout your branch and pull
npm run main            # Checkout main and pull
npm run keepup          # Keep your branch up-to-date with main
npm run merge           # Merge your branch with main

# Docker Management
npm run dls             # List all Docker containers
npm run nuke            # Complete cleanup (removes everything)

# Utilities
npm run cli             # Run CLI Pong game
npm run alias           # Create npm alias for quicker commands
```

### Development Workflow

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Make Changes**
   - Edit frontend files in `src/frontend/src/`
   - Edit backend files in `src/backend/src/`
   - Changes auto-reload due to Docker volume mounts

3. **Build Frontend**
   ```bash
   npx vite build
   ```

4. **Compile TypeScript**
   ```bash
   npx tsc
   ```

## 🐳 Docker

### Docker Services

The project defines two services in `docker-compose.yml`:

#### Development Service
- Exposes ports: `5173` (Vite), `3000` (Backend)
- Volume mounts for live reloading
- Environment: `NODE_ENV=development`

#### Production Service
- Exposes port: `3001` (Frontend), `3000` (Backend)
- Optimized image without dev dependencies
- Environment: `NODE_ENV=production`

### Building Images

Dockerfile uses multi-stage builds:
1. **base**: Node.js v22 slim image
2. **dev**: Development stage with full dependencies
3. **build**: Compilation stage (temporary)
4. **prod**: Production stage (minimal footprint)

### Docker Commands

```bash
# View all containers
npm run dls

# Complete system cleanup
npm run nuke

# Manual Docker commands
docker compose up dev                    # Start dev
docker compose up --build dev            # Rebuild and start
docker compose down                      # Stop all containers
```

## 🔧 Troubleshooting

### SSL Certificate Issues
**Problem**: `ENOENT: no such file or directory, open '/certs/server.key'`

**Solution**: Generate SSL certificates:
```bash
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -nodes -out certs/server.crt -keyout certs/server.key -days 365
```

### Environment File Not Found
**Problem**: `.env` file not found

**Solution**: Create `.env` file or run setup script:
```bash
./setup.sh
# or manually create .env with required variables
```

### Port Already in Use
**Problem**: `EADDRINUSE: address already in use :::3000`

**Solution**: Kill process on that port:
```bash
# Find process
lsof -i :3000

# Kill process (replace PID)
kill -9 <PID>
```

### Database Issues
**Problem**: Database file not created or corrupted

**Solution**: Reset and recreate:
```bash
rm -rf db/transcendence.db
npm run dev
```

### Docker Issues
**Problem**: Docker containers won't start

**Solution**: Complete cleanup and rebuild:
```bash
npm run nuke
npm run redev
```

### Hot-reload Not Working
**Problem**: Changes not reflecting in development

**Solution**: Check Docker volume mounts:
```bash
docker inspect <container_id> | grep -A 10 Mounts
```

Ensure `.env` and `certs/` are properly linked (run `./setup.sh`)

### WebSocket Connection Failed
**Problem**: Real-time features not working

**Solution**:
1. Check browser console for errors
2. Verify backend is running: `curl https://localhost:3000/api/health`
3. Check WebSocket URL in `src/frontend/src/API/mysocket.ts`

## 📊 Game Statistics

The application tracks:
- **Games Played**: Total number of games
- **Games Won**: Total wins
- **Games Lost**: Total losses
- **Win Rate**: Calculated from wins/played
- **Tournament Participation**: Total tournaments joined
- **Tournament Wins**: Total tournaments won

## 🎮 Pong Game Details

### Game Constants
- **Game Width**: 1200px
- **Game Height**: 800px
- **Paddle Speed**: Configurable
- **Ball Velocity**: Physics-based movement

### Game Modes
1. **Practice**: Single player vs AI
2. **Multiplayer**: Player vs Player
3. **Tournament**: Competitive bracket play

## 📞 Support

For issues, questions, or contributions:
1. Check the troubleshooting section
2. Review existing documentation
3. Check application logs
4. Review code comments and TypeScript types

## 📄 License

This is a 42 School project. All rights reserved.

---

**Last Updated**: January 2026  
**Version**: 1.0.0  
**Status**: Production Ready
