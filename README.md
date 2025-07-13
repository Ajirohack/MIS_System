# Membership Initiation System (MIS) - Phase 2: Integration

A comprehensive membership platform with microservices architecture, featuring third-party integrations, SDKs, webhooks, and advanced verification workflows.

## 🚀 Phase 2 Features Implemented

### ✅ Third-party Authentication APIs
- **OAuth Service** (`services/oauth-service/`)
  - Google, GitHub, LinkedIn, Twitter, Facebook OAuth integration
  - Passport.js strategies for multiple providers
  - Token management and refresh mechanisms
  - User profile synchronization

### ✅ SDK Development
- **JavaScript SDK** (`sdk/javascript/`)
  - Complete API client with authentication
  - OAuth integration helpers
  - Webhook signature verification
  - Rate limiting and error handling
  - TypeScript support with full type definitions

### ✅ Webhook System Implementation
- **Webhook Service** (`services/webhook-service/`)
  - Event-driven architecture with Redis queues
  - Retry mechanisms and failure handling
  - Signature verification for security
  - Real-time event delivery
  - Webhook management dashboard

### ✅ Developer Portal Creation
- **Developer Portal** (`portal/`)
  - Interactive API documentation
  - SDK downloads and examples
  - Application management
  - Analytics and usage tracking
  - Community resources and support

### ✅ Media Processing Pipeline
- **Media Service** (`services/media-service/`)
  - File upload and storage management
  - Image processing with Sharp
  - Thumbnail generation
  - Multiple storage backends (S3, MinIO)
  - Batch operations and search

### ✅ Verification Workflows
- **Verification Service** (`services/verification-service/`)
  - Configurable approval workflows
  - Automated verification tasks
  - External service integration
  - Notification system
  - Dashboard and reporting

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway   │    │   Load Balancer │
│   (React)       │◄──►│   (Kong/Nginx)  │◄──►│   (HAProxy)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
        ┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼─────┐
        │ Auth Service │ │ OAuth Svc   │ │ Webhook   │
        │              │ │             │ │ Service   │
        └──────────────┘ └─────────────┘ └───────────┘
                │               │               │
        ┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼─────┐
        │ Member Svc   │ │ Media Svc   │ │ Verify    │
        │              │ │             │ │ Service   │
        └──────────────┘ └─────────────┘ └───────────┘
                │               │               │
        ┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼─────┐
        │ Invitation   │ │ Audit Svc   │ │ Developer │
        │ Service      │ │             │ │ Portal    │
        └──────────────┘ └─────────────┘ └───────────┘
                │               │               │
                └───────────────┼───────────────┘
                                │
                ┌───────────────▼───────────────┐
                │         Database Layer        │
                │   PostgreSQL + Redis + S3     │
                └───────────────────────────────┘
```

## 🛠️ Technology Stack

### Backend Services
- **Node.js** with **TypeScript**
- **Express.js** for REST APIs
- **PostgreSQL** for primary data storage
- **Redis** for caching and sessions
- **Bull** for job queues
- **Passport.js** for OAuth strategies

### Frontend & SDKs
- **React** with **TypeScript**
- **JavaScript SDK** for browser/Node.js
- **Python SDK** (planned)
- **PHP SDK** (planned)

### Infrastructure
- **Docker** for containerization
- **Kubernetes** for orchestration
- **AWS S3/MinIO** for file storage
- **Kong/Nginx** for API gateway

## 📦 Services Overview

### Core Services
1. **Auth Service** (`services/auth-service/`)
   - User authentication and authorization
   - JWT token management
   - Session handling

2. **OAuth Service** (`services/oauth-service/`)
   - Third-party authentication
   - Provider management
   - Token refresh and sync

3. **Webhook Service** (`services/webhook-service/`)
   - Event delivery system
   - Retry mechanisms
   - Webhook management

4. **Media Service** (`services/media-service/`)
   - File upload and processing
   - Image optimization
   - Storage management

5. **Verification Service** (`services/verification-service/`)
   - Approval workflows
   - Automated verification
   - External integrations

### Supporting Services
- **Member Service** - User profile management
- **Invitation Service** - Invitation system
- **Audit Service** - Logging and compliance
- **Developer Portal** - API documentation and tools

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- PostgreSQL 15+
- Redis 6+

### 1. Clone and Setup
```bash
git clone <repository-url>
cd membership-platform
npm install
```

### 2. Start Database Services
```bash
docker-compose up -d postgres redis pgadmin redisinsight
```

### 3. Run Database Migrations
```bash
PGPASSWORD=mispassword psql -h localhost -p 5434 -U misuser -d misdb -f infrastructure/database/schema.sql
```

### 4. Start Services
```bash
# Start all services
npm run dev:all

# Or start individual services
npm run dev:auth
npm run dev:oauth
npm run dev:webhook
npm run dev:media
npm run dev:verification
```

### 5. Access Services
- **Auth Service**: http://localhost:3001
- **OAuth Service**: http://localhost:3002
- **Webhook Service**: http://localhost:3003
- **Media Service**: http://localhost:3004
- **Verification Service**: http://localhost:3005
- **Developer Portal**: http://localhost:3006

## 📚 API Documentation

### Authentication
```javascript
// Using the JavaScript SDK
import MembershipSDK from '@membership-platform/sdk';

const sdk = new MembershipSDK({
  apiKey: 'your-api-key',
  baseURL: 'https://api.membership-platform.com'
});

// Login with email/password
const tokens = await sdk.login('user@example.com', 'password');

// Login with OAuth
const oauthUrl = await sdk.getOAuthUrl('google', 'https://yourapp.com/callback');
const tokens = await sdk.loginWithOAuth('google', code, state);
```

### Webhooks
```javascript
// Create a webhook
const webhook = await sdk.createWebhook({
  name: 'User Events',
  url: 'https://yourapp.com/webhooks/membership',
  events: ['user.created', 'user.updated', 'invitation.accepted']
});

// Verify webhook signature
app.post('/webhooks/membership', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const isValid = sdk.verifyWebhookSignature(
    JSON.stringify(req.body),
    signature,
    webhookSecret
  );
  
  if (isValid) {
    console.log('Webhook received:', req.body);
  }
  
  res.status(200).send('OK');
});
```

### Media Upload
```javascript
// Upload file
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('tags', 'profile,avatar');

const media = await sdk.uploadMedia(formData);

// Get processed image
const imageUrl = `${sdk.config.baseURL}/files/${media.id}?width=300&height=300&format=webp`;
```

## 🔧 Configuration

### Environment Variables
```bash
# Database
DB_HOST=localhost
DB_PORT=5434
DB_NAME=misdb
DB_USER=misuser
DB_PASSWORD=mispassword

# Redis
REDIS_HOST=localhost
REDIS_PORT=6381

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d

# Storage
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=your-s3-bucket
```

## 🧪 Testing

### Run Tests
```bash
# All tests
npm test

# Specific service tests
npm run test:auth
npm run test:oauth
npm run test:webhook
npm run test:media
npm run test:verification

# Coverage
npm run test:coverage
```

### API Testing
```bash
# Using the test endpoints
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

curl -X GET http://localhost:3002/api/v1/oauth/providers
```

## 📊 Monitoring & Analytics

### Health Checks
- `/health` endpoint on all services
- Database connectivity monitoring
- Redis connection status
- External service health checks

### Metrics
- API request/response times
- Error rates and types
- OAuth provider usage
- Webhook delivery success rates
- Media processing performance

### Logging
- Structured JSON logging
- Request/response correlation
- Error tracking and alerting
- Audit trail for compliance

## 🔒 Security Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- OAuth 2.0 integration
- Session management with Redis

### Data Protection
- Password hashing with bcrypt
- API key management
- Webhook signature verification
- Rate limiting and DDoS protection

### Compliance
- GDPR-compliant data handling
- Audit logging for all operations
- Data retention policies
- Privacy controls

## 🚀 Deployment

### Docker Deployment
```bash
# Build all services
docker-compose build

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes Deployment
```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n membership-platform
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Development Guidelines
- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation
- Follow the established code style

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs.membership-platform.com](https://docs.membership-platform.com)
- **API Reference**: [api.membership-platform.com](https://api.membership-platform.com)
- **Community**: [Discord](https://discord.gg/membership-platform)
- **Issues**: [GitHub Issues](https://github.com/membership-platform/issues)

## 🗺️ Roadmap

### Phase 3: Advanced Features
- [ ] Real-time notifications with WebSockets
- [ ] Advanced analytics and reporting
- [ ] Machine learning for fraud detection
- [ ] Multi-tenant architecture
- [ ] Mobile SDKs (iOS/Android)

### Phase 4: Enterprise Features
- [ ] SSO integration (SAML, LDAP)
- [ ] Advanced workflow engine
- [ ] Compliance reporting
- [ ] White-label solutions
- [ ] On-premise deployment

---

**Built with ❤️ by the Membership Platform Team** 