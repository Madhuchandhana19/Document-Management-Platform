# dms-backend

Document Management & Digital Workspace System Backend.

## Tech Stack
- **Framework**: Spring Boot 3.x
- **Language**: Java 17+
- **Build Tool**: Maven
- **Database**: MySQL 8.x
- **Security & Authentication**: Spring Security & JSON Web Tokens (JWT)
- **API Documentation**: Swagger/OpenAPI (Springdoc)

## Getting Started

### Prerequisites
- Java 17 SDK or higher
- Maven 3.8+
- Docker & Docker Compose (optional, for database)

### Running with Docker Compose
To start the database and backend services:
```bash
docker compose up -d
```

### Running Locally
1. Configure your environment variables or update `src/main/resources/application.yml`.
2. Run the application:
```bash
mvn spring-boot:run
```
