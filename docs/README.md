# Fraud Detection Engine Frontend - Documentation

Welcome to the documentation for the Fraud Detection Engine Frontend. This directory contains comprehensive guides for understanding, developing, deploying, and maintaining the application.

## 📚 Documentation Index

### Getting Started
- **[SETUP.md](./SETUP.md)** - Local development environment setup, prerequisites, and quick start guide
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture, component overview, and data flow diagrams

### Development & Features
- **[FRONTEND.md](./FRONTEND.md)** - Frontend structure, Vue components, routing, state management, and key features
- **[BACKEND.md](./BACKEND.md)** - Backend API endpoints, request/response formats, middleware, and error handling
- **[DATABASE_COMMANDS.md](./DATABASE_COMMANDS.md)** - Manual Neo4j and Redis commands for database interaction without the frontend

### Deployment & DevOps
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Docker, Docker Compose profiles, environment configuration, and production setup
- **[CI_CD.md](./CI_CD.md)** - CI/CD pipelines, testing strategies, and automated deployment workflows

### Advanced Topics
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues, debugging tips, and solutions
- **[PERFORMANCE.md](./PERFORMANCE.md)** - Performance optimization, caching strategies, and monitoring
- **[API_REFERENCE.md](./API_REFERENCE.md)** - Complete API endpoint reference and WebSocket events

---

## 🎯 Quick Navigation

### I want to...

| Goal | Document |
|------|----------|
| Set up my development environment | [SETUP.md](./SETUP.md) |
| Understand the system architecture | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Learn about frontend components | [FRONTEND.md](./FRONTEND.md) |
| Explore backend endpoints | [BACKEND.md](./BACKEND.md) & [API_REFERENCE.md](./API_REFERENCE.md) |
| Query Neo4j/Redis directly | [DATABASE_COMMANDS.md](./DATABASE_COMMANDS.md) |
| Deploy the application | [DEPLOYMENT.md](./DEPLOYMENT.md) |
| Run tests and CI/CD | [CI_CD.md](./CI_CD.md) |
| Optimize performance | [PERFORMANCE.md](./PERFORMANCE.md) |
| Troubleshoot issues | [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) |

---

## 📋 Project Overview

**Fraud Detection Engine Frontend** is a real-time Vue 3 + Vite SPA with:
- 🎨 Interactive dashboards and visualizations (D3.js, ECharts)
- 🔄 WebSocket-based transaction streaming
- 📊 Graph visualization (user-device-IP relationships)
- 🗺️ Geographic and temporal heatmaps
- 🧪 Scenario-based testing gallery
- 💾 Historical analysis and export capabilities

**Tech Stack:**
- **Frontend:** Vue 3, TypeScript, Tailwind CSS, D3.js, ECharts, Pinia
- **Backend:** Express.js, Socket.IO, neo4j-driver, redis
- **Databases:** Neo4j (graph), Redis (caching)
- **Deployment:** Docker, Docker Compose

---

## 🚀 Quick Start

```bash
# Clone and navigate to project
cd /path/to/fraudDetectionEngineFrontend

# Install dependencies
npm install
cd backend && npm install && cd ..

# Start backend dev server (terminal 1)
cd backend && npm run dev

# Start frontend dev server (terminal 2)
npm run dev

# Open browser
# → http://localhost:5173
```

For detailed setup instructions, see [SETUP.md](./SETUP.md).

---

## 📖 Document Descriptions

### [SETUP.md](./SETUP.md)
Complete guide for setting up your development environment:
- Prerequisites and version requirements
- Step-by-step installation
- Environment variables and configuration
- Local development workflow
- Common setup issues

### [ARCHITECTURE.md](./ARCHITECTURE.md)
High-level system design and component relationships:
- System architecture diagram
- Component overview
- Data flow and communication patterns
- Integration with external services
- Technology choices and rationale

### [FRONTEND.md](./FRONTEND.md)
Frontend-specific documentation:
- Project structure and file organization
- Vue components and their purposes
- Vue Router configuration
- Pinia state management stores
- Key composables and utilities
- Styling approach

### [BACKEND.md](./BACKEND.md)
Backend implementation details:
- Express server configuration
- API middleware and error handling
- Neo4j integration and queries
- Redis caching patterns
- Socket.IO setup and events
- Request queuing and circuit breaker

### [DATABASE_COMMANDS.md](./DATABASE_COMMANDS.md)
**Direct database access without the frontend:**
- Neo4j Cypher commands for querying graphs
- Neo4j Browser connection and usage
- Redis CLI commands for data inspection
- Common database queries and debugging
- Data schema overview

### [DEPLOYMENT.md](./DEPLOYMENT.md)
Deployment and containerization guide:
- Docker image building and optimization
- Docker Compose profiles (standalone, dev, full)
- Environment configuration for different stages
- Production readiness checklist
- Scaling and resource allocation

### [CI_CD.md](./CI_CD.md)
Continuous integration and deployment:
- GitHub Actions workflow setup
- Automated testing
- Build and push pipelines
- Deployment automation
- Monitoring and alerting

### [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
Solutions for common problems:
- Development environment issues
- API and connectivity problems
- Database connection failures
- Performance degradation
- Docker and containerization issues
- Debugging techniques

### [PERFORMANCE.md](./PERFORMANCE.md)
Performance optimization guide:
- Frontend performance monitoring
- Backend optimization strategies
- Caching patterns and invalidation
- Database query optimization
- WebSocket and streaming optimization
- Load testing and benchmarking

### [API_REFERENCE.md](./API_REFERENCE.md)
Complete API documentation:
- REST endpoints with examples
- WebSocket events and payloads
- Request/response schemas
- Error codes and handling
- Authentication and authorization
- Rate limiting and throttling

---

## 🔗 External Resources

- [Vue 3 Documentation](https://vuejs.org/)
- [Neo4j Documentation](https://neo4j.com/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [D3.js Documentation](https://d3js.org/)
- [ECharts Documentation](https://echarts.apache.org/)
- [Socket.IO Documentation](https://socket.io/docs/)

---

## 📝 Contributing

When updating this documentation:
1. Keep sections concise and focused
2. Use code examples from actual codebase
3. Include command-line examples where relevant
4. Update the README navigation when adding new docs
5. Maintain consistent formatting and structure

---

## ❓ Need Help?

- **Setup issues?** → [SETUP.md](./SETUP.md)
- **How do I...?** → Check the Quick Navigation table above
- **Something broken?** → [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Want to optimize?** → [PERFORMANCE.md](./PERFORMANCE.md)

---

**Last Updated:** March 2026  
**Maintained By:** Development Team
