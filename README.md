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

1.  **Get the `docker-compose.yml` file** (you don't need the full source code).
2.  **Generate a secret** for authentication:
    ```bash
    openssl rand -base64 32
    ```
3.  **Configure environment variables**:
    You can modify `docker-compose.yml` directly or create a `.env` file to override defaults.

    **Available Configuration:**

    | Variable | Description | Default |
    |---|---|---|
    | `APP_URL` | The public URL of the app (required for invites/auth) | `http://localhost:3000` |
    | `DOCKER_IMAGE` | Docker image to use | `trooptreasury:latest` |
    | `TROOP_NAME` | The name of your troop displayed in the app | `Troop 79` |
    | `ADMIN_EMAIL` | Initial admin user email | `admin@example.com` |
    | `ADMIN_PASSWORD` | Initial admin user password | `TroopTreasury2026!` |
    | `AUTH_SECRET` | Secret used for session signing | `replace-me-with-a-random-string` |
    | `POSTGRES_USER` | Database username | `postgres` |
    | `POSTGRES_PASSWORD` | Database password | `password` |

    > **Note**: Changing `TROOP_NAME` or `ADMIN_PASSWORD` after initial setup will update the existing values in the database upon restart.

4.  **Start the application**:
    ```bash
    docker-compose up -d
    ```
5.  **Access the app**: Open `http://localhost:3000` in your browser.
    - Default Admin Login: `admin@example.com` / `TroopTreasury2026!` (or your configured credentials)

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
