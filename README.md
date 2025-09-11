# Innexora - Multi-Tenant SaaS Hotel Management Platform

Innexora is a modern, scalable hotel management SaaS platform built with a multi-tenant architecture. Each hotel gets their own subdomain and dedicated database while sharing the same powerful application infrastructure.

## 🏗️ Architecture

### Multi-Tenant Design

- **Main Domain** (`innexora.app`): Public marketing site and platform management
- **Hotel Subdomains** (`hotel.innexora.app`): Individual hotel management portals
- **Database Isolation**: Each hotel has its own dedicated MongoDB database
- **Secure Access**: Complete data isolation between hotels

### Technology Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express.js, MongoDB
- **Authentication**: JWT-based with tenant-specific user management
- **Database**: MongoDB with multi-tenant connection management

## 🚀 Features

### Platform Features

- Multi-tenant SaaS architecture
- Subdomain-based hotel access
- Scalable database design
- Real-time guest communication
- QR code integration for guest services

### Hotel Management

- Staff management and role-based access
- Room status and housekeeping
- Guest request handling
- Food ordering system
- Billing and invoicing
- Analytics and reporting

### Guest Features

- QR code room access
- Direct communication with hotel staff
- Service requests
- Food ordering
- Real-time updates

## 🏃‍♂️ Quick Start

### Prerequisites

- Node.js 18+
- MongoDB
- Git

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/innexora.git
   cd innexora
   ```

2. **Backend Setup**

   ```bash
   cd backend
   npm install
   cp config/env.example .env
   # Edit .env with your configuration
   ```

3. **Frontend Setup**

   ```bash
   cd ../frontend
   npm install
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Database Setup**

   ```bash
   cd ../backend
   npm run seed:main  # Creates sample hotels
   ```

5. **Start Development Servers**

   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

### Local Testing Setup

For subdomain testing on localhost, add to your `/etc/hosts`:

```
127.0.0.1 localhost
127.0.0.1 marriott.localhost
127.0.0.1 budgetinn.localhost
```

Then access:

- Main site: `http://localhost:3000`
- Marriott Hotel: `http://marriott.localhost:3000`
- Budget Inn: `http://budgetinn.localhost:3000`

## 🧪 Testing

See [TESTING_GUIDE.md](backend/TESTING_GUIDE.md) for comprehensive testing instructions.

### Quick Test

1. Visit `http://localhost:3000` - Should show Innexora public site
2. Visit `http://marriott.localhost:3000` - Should show Marriott login page
3. Register/login at Marriott subdomain
4. Access dashboard and verify hotel-specific data

## 📁 Project Structure

```
innexora/
├── backend/                 # Node.js API server
│   ├── controllers/         # Route controllers
│   ├── middleware/          # Custom middleware
│   │   ├── tenantMiddleware.js  # Multi-tenant logic
│   │   └── authMiddleware.js    # Authentication
│   ├── models/              # MongoDB models
│   │   ├── MainHotel.js     # Main database hotel model
│   │   └── ...              # Tenant database models
│   ├── routes/              # API routes
│   ├── utils/               # Utilities
│   │   ├── databaseManager.js   # Multi-tenant DB manager
│   │   └── seedMainDb.js        # Main DB seeding
│   └── ...
├── frontend/                # Next.js frontend
│   ├── src/
│   │   ├── app/             # App router pages
│   │   ├── components/      # React components
│   │   │   └── tenant/      # Multi-tenant components
│   │   ├── hooks/           # Custom React hooks
│   │   │   └── useTenant.ts # Tenant detection hook
│   │   └── lib/             # Utilities and API client
│   └── ...
└── README.md
```

## 🏨 Multi-Tenant Flow

1. **User visits subdomain** (e.g., `marriott.innexora.app`)
2. **Tenant middleware** detects subdomain and fetches hotel data
3. **Database manager** connects to hotel-specific database
4. **Hotel-specific UI** loads with branding and data
5. **All operations** are isolated to that hotel's database

## 🔧 Configuration

### Environment Variables

**Backend (.env)**

```env
MONGODB_URI=mongodb://localhost:27017/innexora-main
JWT_SECRET=your_secret_key
SAMPLE_HOTEL_DB_URL=mongodb://localhost:27017/hotel-marriott
```

**Frontend (.env.local)**

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_MAIN_DOMAIN=localhost:3000
```

## 🚀 Deployment

### Production Setup

1. Configure wildcard DNS: `*.yourdomain.com`
2. Set up SSL certificates for wildcard domain
3. Update environment variables for production
4. Deploy backend and frontend separately or together

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 🔒 Security

- **Database Isolation**: Complete separation between hotel databases
- **Authentication**: Tenant-specific user authentication
- **Authorization**: Role-based access control per hotel
- **Data Privacy**: No cross-tenant data access
- **Connection Security**: Encrypted database connections

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📧 Email: support@innexora.app
- 💬 Discord: [Join our community](https://discord.gg/innexora)
- 📖 Documentation: [docs.innexora.app](https://docs.innexora.app)

## 🗺️ Roadmap

- [ ] Advanced analytics dashboard
- [ ] Mobile app for staff
- [ ] Integration with payment gateways
- [ ] Advanced reporting features
- [ ] Multi-language support
- [ ] Third-party integrations (PMS, Channel Managers)

---

Built with ❤️ by the Innexora team
