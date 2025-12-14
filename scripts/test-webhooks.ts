#!/usr/bin/env tsx

/**
 * Test script to trigger n8n webhooks with realistic data
 * Run with: npx tsx scripts/test-webhooks.ts
 */

import { upsertGHLContact, formatClientForGHL } from '../src/lib/webhooks/ghl-webhook';
import { sendSMSNotification } from '../src/lib/webhooks/sms-webhook';
import { createCalendarEvent, formatOrderForCalendar } from '../src/lib/webhooks/calendar-webhook';
import { sendToMake } from '../src/lib/integrations/make';

// Load environment variables
import { config } from 'dotenv';
config({ path: '.env' });

async function testGHLWebhook() {
  console.log('\n🧪 Testing GHL/CRM Webhook...');

  const testClient = {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone: '+15145551234',
    preferred_contact: 'sms' as const,
  };

  const formattedData = formatClientForGHL(testClient, {
    isNewClient: true,
    enrollInNurture: true,
  });

  console.log('Sending data:', JSON.stringify(formattedData, null, 2));

  const result = await upsertGHLContact(formattedData);

  if (result.success) {
    console.log('✅ GHL webhook test successful');
    console.log('Response:', result.data);
  } else {
    console.log('❌ GHL webhook test failed:', result.error);
  }
}

async function testSMSWebhook() {
  console.log('\n🧪 Testing SMS Webhook...');

  const testSMS = {
    contactId: 'contact_123456',
    action: 'add' as const,
  };

  console.log('Sending data:', JSON.stringify(testSMS, null, 2));

  const result = await sendSMSNotification(testSMS);

  if (result.success) {
    console.log('✅ SMS webhook test successful');
    console.log('Response:', result.data);
  } else {
    console.log('❌ SMS webhook test failed:', result.error);
  }
}

async function testCalendarWebhook() {
  console.log('\n🧪 Testing Calendar Webhook...');

  const testOrder = {
    id: 'order_789',
    order_number: 1001,
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    assigned_to: 'Maria Tailor',
    type: 'alteration',
    client: {
      first_name: 'Jane',
      last_name: 'Smith',
    },
    garments: [
      {
        services: [
          {
            service: {
              estimated_minutes: 120,
            },
          },
          {
            service: {
              estimated_minutes: 60,
            },
          },
        ],
      },
    ],
  };

  const formattedData = formatOrderForCalendar(testOrder);

  if (!formattedData) {
    console.log('❌ Failed to format order for calendar');
    return;
  }

  console.log('Sending data:', JSON.stringify(formattedData, null, 2));

  const result = await createCalendarEvent(formattedData);

  if (result.success) {
    console.log('✅ Calendar webhook test successful');
    console.log('Response:', result.data);
  } else {
    console.log('❌ Calendar webhook test failed:', result.error);
  }
}

async function testMakeWebhook() {
  console.log('\n🧪 Testing Make.com Webhook...');

  const testPayload = {
    event: 'order.status_changed' as const,
    order_id: 'order_789',
    order_number: 1001,
    new_status: 'ready_for_pickup',
    client: {
      id: 'client_123',
      name: 'Jane Smith',
      phone: '+15145559876',
      email: 'jane.smith@example.com',
      language: 'en',
    },
    items: [
      {
        garment_type: 'Dress',
        services: ['Hemming', 'Dart Adjustment', 'Zipper Replacement'],
        total_cents: 4500,
      },
      {
        garment_type: 'Blazer',
        services: ['Sleeve Shortening', 'Waist Adjustment'],
        total_cents: 3500,
      },
    ],
    totals: {
      subtotal_cents: 8000,
      tps_cents: 400,
      tvq_cents: 800,
      total_cents: 9200,
    },
    timestamp: new Date().toISOString(),
  };

  console.log('Sending data:', JSON.stringify(testPayload, null, 2));

  const result = await sendToMake(testPayload);

  if (result.success) {
    console.log('✅ Make.com webhook test successful');
    console.log('Invoice URL:', result.invoice_url);
  } else {
    console.log('❌ Make.com webhook test failed:', result.error);
  }
}

async function testSMSReminder() {
  console.log('\n🧪 Testing SMS Reminder (like cron job)...');

  const webhookUrl = process.env.N8N_SMS_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log('❌ N8N_SMS_WEBHOOK_URL not configured');
    return;
  }

  const reminderPayload = {
    phone: '+15145551234',
    message: 'Hotte Couture: Your order #1001 is ready for pickup! We\'re open Mon-Fri 9am-6pm. See you soon! 📍123 Fashion Ave',
    template: 'pickup_ready',
    order_id: 'order_789',
    order_number: 1001,
    client_name: 'John Doe',
  };

  console.log('Sending reminder:', JSON.stringify(reminderPayload, null, 2));

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reminderPayload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ SMS reminder sent successfully');
    console.log('Response:', result);
  } catch (error) {
    console.log('❌ SMS reminder failed:', error);
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting webhook tests...\n');
  console.log('Environment check:');
  console.log('- N8N_SMS_WEBHOOK_URL:', process.env.N8N_SMS_WEBHOOK_URL ? '✅ Set' : '❌ Not set');
  console.log('- N8N_CALENDAR_WEBHOOK_URL:', process.env.N8N_CALENDAR_WEBHOOK_URL ? '✅ Set' : '❌ Not set');
  console.log('- N8N_CRM_WEBHOOK_URL:', process.env.N8N_CRM_WEBHOOK_URL ? '✅ Set' : '❌ Not set');
  console.log('- MAKE_WEBHOOK_URL:', process.env.MAKE_WEBHOOK_URL ? '✅ Set' : '❌ Not set');

  // Run all tests
  await testGHLWebhook();
  await testSMSWebhook();
  await testCalendarWebhook();
  await testMakeWebhook();
  await testSMSReminder();

  console.log('\n✨ All webhook tests completed!');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  testGHLWebhook,
  testSMSWebhook,
  testCalendarWebhook,
  testMakeWebhook,
  testSMSReminder,
};