interface GHLContactData {
  name: string;
  email: string;
  phone: string;
  preference: 'Text Messages' | 'Email';
}

export async function upsertGHLContact(contactData: GHLContactData) {
  const webhookUrl =
    'https://otomato456321.app.n8n.cloud/webhook/upsert-contact';

  try {
    console.log('🔄 Sending contact to GHL:', contactData);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contactData),
    });

    if (!response.ok) {
      throw new Error(
        `GHL webhook failed: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();
    console.log('✅ GHL contact upserted successfully:', result);

    // Extract contactId from the response
    const contactId = result.contactId || result.contact_id || null;

    return {
      success: true,
      data: result,
      contactId: contactId,
    };
  } catch (error) {
    console.error('❌ GHL webhook error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export function formatClientForGHL(client: {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  preferred_contact?: 'email' | 'sms';
}): GHLContactData {
  // Map our preferred_contact to GHL preference
  const getGHLPreference = (
    preferredContact?: string
  ): 'Text Messages' | 'Email' => {
    switch (preferredContact) {
      case 'sms':
        return 'Text Messages';
      case 'email':
        return 'Email';
      default:
        return 'Email'; // Default to email
    }
  };

  return {
    name: `${client.first_name} ${client.last_name}`.trim(),
    email: client.email || '',
    phone: client.phone || '',
    preference: getGHLPreference(client.preferred_contact),
  };
}
