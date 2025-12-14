# External Integrations - Postponed

The following integrations are noted for future consideration but should NOT be implemented at this time:

## Payment Processing
- **Stripe** - Payment collection and webhooks
  - Current Status: Partially implemented but webhook handlers are placeholders
  - Decision: Postpone until core business features are complete
  - Alternative: Manual payment tracking for now

## Accounting
- **QuickBooks** - Accounting software integration
  - Current Status: Not implemented
  - Decision: Postpone indefinitely
  - Alternative: Manual export of financial data

## Marketing
- **Mailchimp** - Email marketing
  - Current Status: Not implemented
  - Decision: Postpone indefinitely
  - Alternative: Simple email notifications via SMTP

## Workflow Automation
- **n8n** - Workflow automation platform
  - Current Status: Referenced in webhook handlers but not integrated
  - Decision: Postpone indefinitely
  - Alternative: Direct implementation of notification logic

## Calendar
- **Google Calendar** - Appointment synchronization
  - Current Status: Not implemented
  - Decision: Postpone indefinitely
  - Alternative: Internal calendar system only

## SMS Services
- **Twilio** - SMS notifications
  - Current Status: Not implemented
  - Decision: Postpone indefinitely
  - Alternative: Email notifications only

## Notes
- Focus should be on internal business features first
- All external integrations add complexity and dependencies
- Consider building minimal internal solutions instead
- Revisit these only after core reporting and user management is complete