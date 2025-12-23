# Hotte Couture

A modern, production-ready web application built with Next.js 14+, TypeScript, and Tailwind CSS.

## 🚀 Features

- **Next.js 14+** with App Router and Server Components
- **TypeScript** with strict configuration
- **Tailwind CSS** for styling with custom design system
- **Supabase** for authentication and database
- **ESLint + Prettier** for code quality and formatting
- **Vitest + Testing Library** for unit and integration testing
- **Playwright** for end-to-end testing
- **GitHub Actions** for CI/CD
- **Vercel-ready** configuration
- **Responsive design** with tablet-first approach
- **Global error handling** with error boundaries
- **SEO optimized** with proper meta tags

### Business Features
- **Order Management** - Complete order intake and tracking system
- **Kanban Board** - Visual order management with drag-and-drop
- **Customer Portal** - Public order status tracking
- **Time Tracking** - Per-garment, per-service task and time management
- **Task Management** - Auto-create tasks when order enters "working" status
- **Staff Management** - Hardcoded staff list (Audrey, Solange, Audrey-Anne)
- **Stripe Payments** - Online payments with 50% deposits for custom orders, auto-triggered payment links
- **Cash/Manual Payments** - Record in-person cash or card terminal payments
- **QR Code Labels** - Scannable order labels with dual copies
- **Business Analytics** - Revenue, order, and customer insights
- **Multi-user Support** - Role-based access for owners and seamstresses
- **AI Chat Assistant** - Internal chatbot for staff queries (OpenRouter/GPT-4)
- **SMS Notifications** - Automated SMS via n8n/Twilio for order ready and payment requests

## 🛠️ Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database & Auth**: Supabase
- **Testing**: Vitest, Testing Library, Playwright
- **Linting**: ESLint + Prettier
- **CI/CD**: GitHub Actions
- **Deployment**: Vercel

## 📦 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd hotte-couture
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env.local
```

4. Update the environment variables in `.env.local` with your values:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (server-only)
   - `STRIPE_SECRET_KEY`: Your Stripe secret key (sk_live_... or sk_test_...)
   - `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook signing secret (whsec_...)
   - `N8N_SMS_WEBHOOK_URL`: n8n webhook URL for SMS notifications

## 🔐 Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your project URL and keys
3. Copy the values to your `.env.local` file
4. Enable email authentication in Authentication > Settings
5. Configure your site URL in Authentication > URL Configuration

### Authentication Features
- Email OTP sign-in (magic links)
- Server-side session management
- Protected routes with middleware
- User role management (owner, seamstress, custom, clerk)

## 🚀 Development

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## 🧪 Testing

### Unit Tests
```bash
# Run unit tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:ui
```

### E2E Tests
```bash
# Run E2E tests
npm run test:e2e

# Run E2E tests in headed mode
npm run test:e2e:headed

# Run E2E tests with UI
npm run test:e2e:ui
```

## 🔧 Code Quality

### Linting
```bash
# Run ESLint
npm run lint

# Fix ESLint issues
npm run lint:fix
```

### Formatting
```bash
# Check Prettier formatting
npm run format:check

# Format code with Prettier
npm run format
```

### Type Checking
```bash
# Run TypeScript type check
npm run type-check
```

## 🏗️ Building

Build the application for production:

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set up environment variables in Vercel dashboard
3. Deploy automatically on every push to main branch

### Manual Deployment

1. Build the application:
```bash
npm run build
```

2. Deploy the `.next` folder to your hosting provider

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── auth/              # Authentication pages
│   │   ├── sign-in/       # Sign-in page
│   │   ├── callback/      # Auth callback
│   │   └── sign-out/      # Sign-out route
│   ├── dashboard/         # Protected dashboard
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── error.tsx          # Error boundary
│   └── not-found.tsx      # 404 page
├── components/            # Reusable components
│   └── ui/               # UI components
├── lib/                  # Utility functions
│   ├── auth/             # Authentication utilities
│   │   └── roles.ts      # User role definitions
│   └── supabase/         # Supabase clients
│       ├── client.ts     # Browser client
│       └── server.ts     # Server client
├── middleware.ts         # Auth middleware
├── styles/               # Additional styles
└── test/                 # Test setup files

tests/
└── e2e/                  # End-to-end tests

.github/
└── workflows/            # GitHub Actions workflows
```

## 🔧 Configuration

### TypeScript
- Strict TypeScript configuration
- Path aliases configured (`@/*`)
- Comprehensive type checking enabled

### ESLint
- Next.js recommended rules
- TypeScript support
- Prettier integration
- Testing Library rules

### Tailwind CSS
- Custom design system
- Responsive breakpoints
- Dark mode support
- Custom animations

### Testing
- Vitest for unit tests
- Testing Library for component testing
- Playwright for E2E testing
- Coverage reporting

## 📝 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check Prettier formatting
- `npm run type-check` - Run TypeScript type check
- `npm run test` - Run unit tests
- `npm run test:coverage` - Run tests with coverage
- `npm run test:ui` - Run tests with UI
- `npm run test:e2e` - Run E2E tests
- `npm run test:e2e:ui` - Run E2E tests with UI
- `npm run test:e2e:headed` - Run E2E tests in headed mode

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [Vercel](https://vercel.com/) - Deployment platform
