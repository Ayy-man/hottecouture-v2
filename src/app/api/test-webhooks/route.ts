import { NextRequest, NextResponse } from 'next/server';
import { upsertGHLContact, formatClientForGHL } from '@/lib/webhooks/ghl-webhook';
import { sendSMSNotification } from '@/lib/webhooks/sms-webhook';
import { createCalendarEvent } from '@/lib/webhooks/calendar-webhook';

export async function GET(_request: NextRequest) {
  const results = [];

  // Test 1: GHL CRM Webhook
  const testClient = formatClientForGHL({
    first_name: 'Test',
    last_name: 'User',
    email: 'test@example.com',
    phone: '+15145550000',
    preferred_contact: 'sms',
  }, {
    isNewClient: true,
    enrollInNurture: true,
  });

  const ghlResult = await upsertGHLContact(testClient);
  results.push({ webhook: 'GHL CRM', success: ghlResult.success, data: ghlResult });

  // Test 2: SMS Webhook
  const smsResult = await sendSMSNotification({
    contactId: 'test_contact_123',
    action: 'add',
  });
  results.push({ webhook: 'SMS', success: smsResult.success, data: smsResult });

  // Test 3: Calendar Webhook
  const calendarResult = await createCalendarEvent({
    title: 'Test Order - Webhook Test',
    description: 'Testing calendar webhook integration',
    start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'Test Tailor',
    order_id: 'test_order_123',
    order_number: 9999,
    client_name: 'Test User',
    estimated_hours: 2,
  });
  results.push({ webhook: 'Calendar', success: calendarResult.success, data: calendarResult });

  return NextResponse.json({
    message: 'Webhook tests completed',
    timestamp: new Date().toISOString(),
    results,
  });
}