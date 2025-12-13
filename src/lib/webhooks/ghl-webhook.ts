interface GHLContactData {
  name: string;
  email: string;
  phone: string;
  preference: 'Text Messages' | 'Email';
  tags?: string[];
  source?: string;
}

export async function upsertGHLContact(contactData: GHLContactData) {
  const webhookUrl = process.env.N8N_CRM_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('⚠️ N8N_CRM_WEBHOOK_URL not configured');
    return {
      success: false,
      error: 'CRM webhook not configured (N8N_CRM_WEBHOOK_URL)',
    };
  }

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

export function formatClientForGHL(
  client: {
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    preferred_contact?: 'email' | 'sms';
  },
  options?: {
    isNewClient?: boolean;
    enrollInNurture?: boolean;
  }
): GHLContactData {
  const getGHLPreference = (
    preferredContact?: string
  ): 'Text Messages' | 'Email' => {
    switch (preferredContact) {
      case 'sms':
        return 'Text Messages';
      case 'email':
        return 'Email';
      default:
        return 'Email';
    }
  };

  const tags: string[] = [];
  if (options?.isNewClient) {
    tags.push('new_client');
  }
  if (options?.enrollInNurture !== false) {
    tags.push('nurture_sequence');
  }

  const result: GHLContactData = {
    name: `${client.first_name} ${client.last_name}`.trim(),
    email: client.email || '',
    phone: client.phone || '',
    preference: getGHLPreference(client.preferred_contact),
    source: 'hotte_couture_app',
  };

  if (tags.length > 0) {
    result.tags = tags;
  }

  return result;
}
