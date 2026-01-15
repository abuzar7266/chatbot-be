# NestJS v11 Template

A production-ready NestJS v11 template with **Supabase Auth + Supabase Database (Postgres)**, Throttling, Caching, and authentication decorators.

## 🚀 Features

- **NestJS v11** - Latest version with all modern features
- **Supabase Auth** - Validate Supabase access tokens (Bearer) in a global guard
- **Supabase Database (PostgreSQL)** - Use Supabase Postgres via **TypeORM** with migrations
- **Throttling** - Rate limiting with configurable TTL and limits
- **Caching** - Built-in cache support with configurable TTL
- **Authentication Decorators** - Ready-to-use auth decorators (with console logging for development)
- **Swagger Documentation** - Auto-generated API documentation
- **Validation** - Class-validator and class-transformer integration
- **Error Handling** - Global exception filters
- **Logging** - Request/response logging interceptors
- **Docker Support** - Docker and Docker Compose configuration
- **TypeScript** - Full TypeScript support with strict mode
- **ESLint & Prettier** - Code quality and formatting tools

## 📁 Project Structure

```
nestjs-template/
├── src/
│   ├── app.module.ts              # Root application module
│   ├── main.ts                    # Application entry point
│   ├── app.controller.ts          # Root controller
│   ├── app.service.ts             # Root service
│   ├── config/                    # Configuration module
│   │   ├── config.module.ts
│   │   ├── config.service.ts
│   │   ├── config-validator.service.ts
│   │   ├── env.validation.ts
│   │   ├── throttler-config.service.ts
│   │   └── cache-config.service.ts
│   ├── supabase/                  # Supabase module (Auth client)
│   │   ├── supabase.constants.ts
│   │   ├── supabase.module.ts
│   │   └── supabase.service.ts
│   ├── database/                  # TypeORM + migrations (Supabase Postgres)
│   │   ├── database.module.ts
│   │   ├── typeorm.config.ts
│   │   ├── run-migrations.ts
│   │   ├── entities/
│   │   │   └── example.entity.ts
│   │   └── migrations/
│   │       └── 1710000000000-CreateExamplesTable.ts
│   ├── common/                    # Shared utilities
│   │   ├── decorators/            # Custom decorators
│   │   │   ├── auth.decorator.ts
│   │   │   ├── public.decorator.ts
│   │   │   ├── roles.decorator.ts
│   │   │   └── current-user.decorator.ts
│   │   ├── guards/                # Authentication guards
│   │   │   ├── auth.guard.ts
│   │   │   ├── roles.guard.ts
│   │   │   └── throttler-behind-proxy.guard.ts
│   │   ├── filters/               # Exception filters
│   │   │   └── http-exception.filter.ts
│   │   ├── interceptors/          # Request/response interceptors
│   │   │   ├── transform.interceptor.ts
│   │   │   ├── logging.interceptor.ts
│   │   │   └── cache.interceptor.ts
│   │   ├── pipes/                 # Validation pipes
│   │   │   └── validation.pipe.ts
│   │   └── dto/                   # Common DTOs
│   │       └── pagination.dto.ts
│   └── modules/                   # Feature modules
│       └── example/               # Example module
│           ├── example.module.ts
│           ├── example.controller.ts
│           ├── example.service.ts
│           └── dto/
│               └── create-example.dto.ts
├── test/                          # E2E tests
├── scripts/                       # Utility scripts
│   └── validate-env.js           # Environment validation script
├── env.example                    # Environment variables template
├── docker-compose.yml             # Docker Compose configuration
├── Dockerfile                     # Docker configuration
├── nest-cli.json                  # NestJS CLI configuration
├── tsconfig.json                  # TypeScript configuration
└── package.json                   # Dependencies

```

## 🛠️ Installation

### Prerequisites

- Node.js v20 or higher
- MongoDB (local or Docker)
- npm, yarn, or pnpm

### Setup

1. **Clone or copy this template**

2. **Install dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Configure environment variables**
   ```bash
   # Create .env file (copy from .env.example or create manually)
   # Required: MONGODB_URI must be set
   ```
   
   Create `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/nestjs_template
   THROTTLE_TTL=60
   THROTTLE_LIMIT=10
   CACHE_TTL=300
   CACHE_MAX=100
   ```
   
   **⚠️ Important:** The application will fail to start if required environment variables are missing. Currently, `MONGODB_URI` is required.

4. **Start MongoDB** (if running locally)
   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:7
   
   # Or use your local MongoDB installation
   ```

5. **Run the application**
   ```bash
   # Development mode
   npm run start:dev
   
   # Production mode
   npm run build
   npm run start:prod
   ```

## 🐳 Docker Setup

### Using Docker Compose

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Using Docker only

```bash
# Build image
docker build -t nestjs-template .

# Run container
docker run -p 3000:3000 --env-file .env nestjs-template
```

## 📚 API Documentation

Once the application is running, access Swagger documentation at:

```
http://localhost:3000/api/docs
```

## 🔐 Authentication Decorators

The template includes authentication decorators that currently log to console. You can use them as follows:

### @Auth() Decorator
```typescript
@Auth(['admin'])
@Get('protected')
getProtected() {
  return 'This is a protected route';
}
```

### @Roles() Decorator
```typescript
@Roles('admin', 'user')
@Get('admin')
getAdmin() {
  return 'Admin only route';
}
```

### @Public() Decorator
```typescript
@Public()
@Get('public')
getPublic() {
  return 'This is a public route';
}
```

### @CurrentUser() Decorator
```typescript
@Get('profile')
getProfile(@CurrentUser() user: any) {
  return user;
}
```

## 🔐 Auth (Supabase)

Auth is handled via **Supabase Auth**:

- **Sign up**: `POST /api/auth/signup` (public)
- **Sign in**: `POST /api/auth/signin` (public)
- **Current user**: `GET /api/auth/me` (requires `Authorization: Bearer <access_token>`)

Supabase sends the **email verification link** if email confirmation is enabled on the Supabase project. The backend simply proxies sign-up/sign-in and validates tokens on protected routes.

Example request bodies:

```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "fullName": "Jane Doe"
}
```

```http
POST /api/auth/signin
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

Response from `signin` includes:

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<refresh>",
  "user": { /* Supabase user */ }
}
```

Use the `accessToken` in the `Authorization` header for protected routes:

```http
Authorization: Bearer <accessToken>
```

## 🗄️ MongoDB Usage

### Creating a Schema

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;
  
  @Prop({ unique: true })
  email: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
```

### Using in Module

```typescript
@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])
  ],
})
export class UserModule {}
```

### Using in Service

```typescript
@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>
  ) {}
  
  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = new this.userModel(createUserDto);
    return user.save();
  }
}
```

## ⚡ Throttling

Throttling is configured globally. Configure limits in `.env`:

```env
THROTTLE_TTL=60      # Time window in seconds
THROTTLE_LIMIT=10    # Max requests per time window
```

To skip throttling on specific routes, use the `@Public()` decorator.

## 💾 Caching

Caching is available globally. Use it in controllers:

```typescript
@Get()
@UseInterceptors(CacheInterceptor)
@CacheTTL(60)  // Cache for 60 seconds
findAll() {
  return this.service.findAll();
}
```

Configure cache settings in `.env`:

```env
CACHE_TTL=300   # Default TTL in seconds
CACHE_MAX=100   # Maximum number of cached items
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

## 📝 Scripts

- `npm run start` - Start application
- `npm run start:dev` - Start in development mode with watch
- `npm run start:debug` - Start in debug mode
- `npm run start:prod` - Start in production mode
- `npm run build` - Build application
- `npm run format` - Format code with Prettier
- `npm run lint` - Lint code with ESLint
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run E2E tests

## 🏗️ Creating New Modules

Use NestJS CLI to generate new modules:

```bash
# Generate a new module
nest g module modules/users

# Generate a controller
nest g controller modules/users

# Generate a service
nest g service modules/users
```

## 🔧 Configuration

All configuration is managed through environment variables. See `.env.example` for available options.

### Environment Variable Validation

The application validates required environment variables at startup. If any required variable is missing, the application will fail to start with a clear error message.

**Required Variables:**
- `MONGODB_URI` - MongoDB connection string (required)

**Optional Variables:**
- `NODE_ENV` - Environment (default: `development`)
- `PORT` - Server port (default: `3000`)
- `THROTTLE_TTL` - Throttle time window in seconds (default: `60`)
- `THROTTLE_LIMIT` - Max requests per time window (default: `10`)
- `CACHE_TTL` - Cache TTL in seconds (default: `300`)
- `CACHE_MAX` - Max cached items (default: `100`)
- `JWT_SECRET` - JWT secret key (optional)
- `JWT_EXPIRES_IN` - JWT expiration (default: `1d`)

**Validation happens:**
1. **At build time** - `npm run build` will run `validate:env` script first
2. **At startup** - Application validates all environment variables before starting
3. **Manually** - Run `npm run validate:env` to check your environment variables

If validation fails, you'll see an error like:
```
❌ Environment validation failed!

Missing or invalid environment variables:
MONGODB_URI should not be empty

Please check your .env file and ensure all required variables are set.
See .env.example for reference.
```

## 📦 Dependencies

### Core
- `@nestjs/common` - NestJS common utilities
- `@nestjs/core` - NestJS core framework
- `@nestjs/platform-express` - Express platform adapter

### Database
- `@nestjs/mongoose` - MongoDB integration
- `mongoose` - MongoDB ODM

### Features
- `@nestjs/config` - Configuration management
- `@nestjs/throttler` - Rate limiting
- `@nestjs/cache-manager` - Caching
- `@nestjs/swagger` - API documentation

### Validation
- `class-validator` - Decorator-based validation
- `class-transformer` - Object transformation

## 🤝 Contributing

This is a template project. Feel free to customize it according to your needs.

## 📄 License

MIT

## 🎯 Next Steps

1. Implement actual authentication logic in guards
2. Add JWT token generation and validation
3. Create user management module
4. Add database migrations if needed
5. Set up CI/CD pipeline
6. Add more feature modules as needed

---

**Happy Coding! 🚀**

