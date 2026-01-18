# What Do I Owe?

A mobile-first web application for tracking purchases and payments. Know exactly what you owe at any time.

## Features

- **User Authentication**: Secure email/password login and registration
- **Account Sharing**: Generate access codes to share account access with others via email
- **Purchase Tracking**: Log purchases with date, amount, and description
- **Payment Tracking**: Log payments with automatic allocation to oldest purchases first
- **Amount Due**: See a running total of what you owe based on purchases and payments
- **Transaction Logs**: View and filter your transaction history
  - Filter by type (purchases only, payments only)
  - Hide paid purchases (on by default)
  - Filter by month/year
- **Partial Payment Tracking**: See remaining amount on partially paid purchases
- **Mobile Optimized**: Works great on phones with a responsive, touch-friendly design

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Database**: SQLite with Drizzle ORM
- **Authentication**: NextAuth.js v5
- **Styling**: Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd what_do_i_owe
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set your `AUTH_SECRET` (generate with `openssl rand -base64 32`)

4. Initialize the database:
   ```bash
   npm run db:migrate
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_PATH` | Path to SQLite database file |
| `AUTH_SECRET` | Secret key for NextAuth.js session encryption |
| `AUTH_URL` | Base URL of the application |

## Usage

1. **Register**: Create an account with your email and password
2. **Dashboard**: View your current amount due and add purchases/payments
3. **Owe**: Click to add a new purchase (amount you owe)
4. **Pay**: Click to add a new payment (reduces what you owe)
5. **Logs**: View your transaction history with various filters
6. **Settings**: Generate access codes to share your account with others

## License

MIT
