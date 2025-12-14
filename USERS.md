# User Management Guide

## User Roles

Hotte Couture supports three main user roles:

### 1. Owner (Audrey)
- **Email**: audrey@hottecouture.com
- **Permissions**: Full access to all features
  - View and manage all orders
  - Access to business analytics
  - Manage pricing and services
  - User management
  - System settings

### 2. Seamstress (Solange)
- **Email**: solange@hottecouture.com
- **Permissions**: Production and order management
  - View assigned orders
  - Update order status
  - Track time on tasks
  - Access to production board
  - Limited customer information

### 3. Seamstress (Audrey-Anne)
- **Email**: audreyanne@hottecouture.com
- **Permissions**: Production and order management
  - View assigned orders
  - Update order status
  - Track time on tasks
  - Access to production board
  - Limited customer information

## User Assignment in Orders

When creating or editing orders, you can assign work to:
- **Audrey** (Owner) - Identified with 👑 icon
- **Solange** (Seamstress) - Identified with ✂️ icon
- **Audrey-Anne** (Seamstress) - Identified with 🧵 icon

## Workload Distribution

The system tracks workload per user:
- Daily capacity is set to 8 hours per person
- Workload Scheduler shows capacity utilization
- Today's Tasks page can be filtered by assignee
- Overdue tasks and capacity warnings are tracked

## Authentication

- Users authenticate via email magic link (no password)
- Session management is handled by Supabase Auth
- Role-based middleware protects routes
- Session persists across browser refreshes