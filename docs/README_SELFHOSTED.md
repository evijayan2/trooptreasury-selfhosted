# TroopTreasury (Self-Hosted Edition)

Modern, secure finance management for your scout troop.

## Features
- **IBA Tracking**: Automatic balance management for every scout.
- **Campout Management**: Registration and deposit tracking.
- **Fundraising**: specialized tools for product sales and general campaigns.
- **Financial Reports**: Built-in reports for transparency.
- **Responsive Design**: Works great on mobile and desktop.

## Quick Start (Docker)

The easiest way to run TroopTreasury is using Docker Compose.

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Installation

1.  **Clone the repository** (or download the source).
2.  **Generate a secret** for authentication:
    ```bash
    openssl rand -base64 32
    ```
3.  **Create a `.env` file** (or use the environment variables in `docker-compose.yml`):
    ```env
    AUTH_SECRET=your-random-secret
    DATABASE_URL=postgresql://postgres:password@db:5432/trooptreasury?schema=public
    ```
4.  **Start the application**:
    ```bash
    docker-compose up -d
    ```
5.  **Access the app**: Open `http://localhost:3000` in your browser.

## Database Migrations

The application automatically runs database migrations on startup. If you need to run them manually:

```bash
docker-compose exec app npx prisma db push
```

## Initial Setup

1.  Register the first user.
2.  The system will automatically create the default troop and assign you as the administrator.
3.  Invite other leaders and parents to join.

## Support

For issues and feature requests, please open an issue in the GitHub repository.

---
&copy; 2026 TroopTreasury
