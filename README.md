# TroopTreasury

Secure, simple finance management for your scout troop. 
Now with **Multi-Tenant Support** for managing multiple troops on a single instance!

## Features

- **Multi-Tenant Architecture**: Each troop gets a dedicated workspace (`/dashboardtroop-slug/...`) with isolated data.
- **Financial Management**: Track IBA balances, campout costs, and troop transactions.
- **Fundraising**: Support for campaigns and product sales with automatic profit calculations.
- **Role-Based Access Control**: Granular permissions (Admin, Financier, Leader, Scout, Parent).
- **Subscription Management** (Hosted Mode): Built-in specialized billing, lifecycle states (Pause/Resume/Grace Period), and Stripe integration.
- **Data Portability**: Full ZIP export of troop data.

## Deployment Modes

### 1. Self-Hosted (Default)
Ideal for a single troop deploying their own instance.
- **Configuration**: No special setup needed.
- **Behavior**: The root URL (`/`) behaves as the default troop dashboard.
- **Billing**: Disabled.

### 2. Hosted (SaaS Mode)
For running a service supporting multiple troops.
- **Configuration**: Set `NEXT_PUBLIC_IS_HOSTED=true`.
- **Behavior**: Root URL is a marketing/landing page. Users register new troops via `/register`.
- **Billing**: Enabled via Stripe.
    - Requires `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`.

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables (`.env`):
   ```bash
   DATABASE_URL="postgresql://user:password@localhost:5432/troop_treasury"
   AUTH_SECRET="your-secret-key"
   
   # Optional: Hosted Mode
   # NEXT_PUBLIC_IS_HOSTED="true"
   # STRIPE_SECRET_KEY="sk_test_..."
   ```
4. Initialize the database:
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```
5. Run the development server:
   ```bash
   npm run dev
   ```

## Architecture

- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js (v5)
- **Styling**: Tailwind CSS + shadcn/ui
- **Tenancy**: 
    - **Troop Model**: Central entity for tenant isolation.
    - **Middleware**: Resolves tenant context from URL path.

## 📘 Documentation

For a detailed guide on usage, see the **[User Guide](./USER_GUIDE.md)**.

## 🚀 Deployments

| Environment | Status | URL |
| :--- | :--- | :--- |
| **Production** | 🟢 Live | [https://trooptreasury.vercel.app](https://trooptreasury.vercel.app) |
