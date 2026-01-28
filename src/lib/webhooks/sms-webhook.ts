interface SMSNotificationData {
  contactId: string
  action: 'add' | 'remove'
}

export async function sendSMSNotification(notificationData: SMSNotificationData) {
  const webhookUrl = process.env.N8N_SMS_WEBHOOK_URL
  
  if (!webhookUrl) {
    console.warn('⚠️ N8N_SMS_WEBHOOK_URL not configured')
    return { 
      success: false, 
      error: 'SMS webhook not configured (N8N_SMS_WEBHOOK_URL)' 
    }
  }
  
  try {
    console.log('📱 Sending SMS notification:', notificationData)
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notificationData),
    })

    if (!response.ok) {
      throw new Error(`SMS webhook failed: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    console.log('✅ SMS notification sent successfully:', result)
    
    return { 
      success: true, 
      data: result
    }

  } catch (error) {
    console.error('❌ SMS webhook error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}
