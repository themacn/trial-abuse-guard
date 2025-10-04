# Package.json Examples

Example package.json configurations for different project types using trial-abuse-guard.

## Basic Node.js Project

```json
{
  "name": "my-saas-app",
  "version": "1.0.0",
  "description": "SaaS application with trial abuse protection",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "jest"
  },
  "dependencies": {
    "trial-abuse-guard": "^1.0.0",
    "express": "^4.18.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0",
    "jest": "^29.0.0"
  }
}
```

## Next.js with NextAuth

```json
{
  "name": "nextjs-with-trial-protection",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "trial-abuse-guard": "^1.0.0",
    "next": "14.0.0",
    "next-auth": "^5.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "typescript": "^5.0.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "14.0.0"
  }
}
```

## Next.js with Clerk

```json
{
  "name": "nextjs-clerk-trial-protection",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "trial-abuse-guard": "^1.0.0",
    "@clerk/nextjs": "^4.0.0",
    "next": "14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "typescript": "^5.0.0"
  }
}
```

## Express.js with MongoDB

```json
{
  "name": "express-mongodb-trial-guard",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest"
  },
  "dependencies": {
    "trial-abuse-guard": "^1.0.0",
    "express": "^4.18.0",
    "mongodb": "^6.0.0",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0",
    "jest": "^29.0.0"
  }
}
```

## TypeScript Project

```json
{
  "name": "typescript-trial-guard",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "dev:watch": "ts-node-dev src/index.ts"
  },
  "dependencies": {
    "trial-abuse-guard": "^1.0.0",
    "express": "^4.18.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/express": "^4.17.0",
    "typescript": "^5.0.0",
    "ts-node": "^10.9.0",
    "ts-node-dev": "^2.0.0"
  }
}
```

## Microservice Architecture

```json
{
  "name": "trial-abuse-microservice",
  "version": "1.0.0",
  "description": "Dedicated trial abuse detection service",
  "scripts": {
    "start": "node dist/server.js",
    "dev": "ts-node-dev src/server.ts",
    "build": "tsc",
    "docker:build": "docker build -t trial-abuse-service .",
    "docker:run": "docker run -p 3000:3000 trial-abuse-service"
  },
  "dependencies": {
    "trial-abuse-guard": "^1.0.0",
    "fastify": "^4.0.0",
    "redis": "^4.6.0",
    "@fastify/cors": "^8.0.0",
    "@fastify/helmet": "^10.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "ts-node-dev": "^2.0.0"
  }
}
```

## Serverless (Vercel/Netlify)

```json
{
  "name": "serverless-trial-guard",
  "version": "1.0.0",
  "scripts": {
    "dev": "vercel dev",
    "build": "vercel build",
    "deploy": "vercel"
  },
  "dependencies": {
    "trial-abuse-guard": "^1.0.0"
  },
  "devDependencies": {
    "@vercel/node": "^3.0.0"
  }
}
```

## Full-Stack Application

```json
{
  "name": "fullstack-saas-with-protection",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "frontend",
    "backend"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "npm run dev --workspace=backend",
    "dev:frontend": "npm run dev --workspace=frontend",
    "build": "npm run build --workspace=backend && npm run build --workspace=frontend",
    "test": "npm run test --workspaces"
  },
  "devDependencies": {
    "concurrently": "^8.0.0"
  }
}
```

Backend workspace (`backend/package.json`):
```json
{
  "name": "backend",
  "version": "1.0.0",
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "test": "jest"
  },
  "dependencies": {
    "trial-abuse-guard": "^1.0.0",
    "express": "^4.18.0",
    "postgresql": "^0.1.0",
    "bcrypt": "^5.1.0",
    "jsonwebtoken": "^9.0.0"
  }
}
```

Frontend workspace (`frontend/package.json`):
```json
{
  "name": "frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^5.0.0"
  }
}
```

## Docker Configuration

`Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Build if needed
RUN npm run build || true

EXPOSE 3000

CMD ["npm", "start"]
```

`docker-compose.yml`:
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/myapp
    depends_on:
      - mongo
      - redis
    
  mongo:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
      
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  mongo_data:
```

## Environment Variables Template

`.env.example`:
```bash
# Application
NODE_ENV=development
PORT=3000

# Trial Abuse Guard API Keys (optional but recommended)
IPQS_API_KEY=your_ipqualityscore_api_key
VPNAPI_KEY=your_vpnapi_key
PROXYCHECK_KEY=your_proxycheck_key

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/myapp
DATABASE_URL=postgresql://user:password@localhost:5432/myapp
REDIS_URL=redis://localhost:6379

# Authentication Providers
CLERK_SECRET_KEY=sk_live_your_clerk_secret_key
NEXTAUTH_SECRET=your_nextauth_secret_key

# Email Service (if needed)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Monitoring (optional)
SENTRY_DSN=your_sentry_dsn
DATADOG_API_KEY=your_datadog_key
```

## NPM Scripts Examples

### Development Scripts
```json
{
  "scripts": {
    "dev": "nodemon src/server.js",
    "dev:debug": "DEBUG=trial-abuse-guard* npm run dev",
    "dev:test": "NODE_ENV=test npm run dev",
    "test:abuse": "node scripts/test-abuse-detection.js"
  }
}
```

### Production Scripts
```json
{
  "scripts": {
    "start": "NODE_ENV=production node src/server.js",
    "pm2:start": "pm2 start ecosystem.config.js",
    "pm2:stop": "pm2 stop all",
    "pm2:restart": "pm2 restart all",
    "logs": "pm2 logs"
  }
}
```

### Testing Scripts
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:integration": "jest --config jest.integration.config.js",
    "test:e2e": "playwright test"
  }
}
```

### Build Scripts
```json
{
  "scripts": {
    "build": "tsc",
    "build:prod": "NODE_ENV=production npm run build",
    "clean": "rimraf dist",
    "prebuild": "npm run clean",
    "postbuild": "npm run copy-assets"
  }
}
```

Choose the configuration that best matches your project structure and requirements.