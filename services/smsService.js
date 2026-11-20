/**
 * ============================================================================
 * PACKBANG SELLER CENTER - SMS SERVICE
 * ============================================================================
 * Pluggable SMS Gateway Client for Bangladeshi SMS Providers.
 * 
 * Supported Providers via Environment Variables:
 * 1. GREENWEB BD:
 *    - SMS_PROVIDER=greenweb
 *    - SMS_API_KEY=your_greenweb_token
 * 
 * 2. BULKSMS BD:
 *    - SMS_PROVIDER=bulksmsbd
 *    - SMS_API_KEY=your_bulksmsbd_api_key
 *    - SMS_SENDER_ID=your_sender_id (optional, default: Packbang)
 * 
 * 3. STEADFAST SMS / GENERIC GATEWAY:
 *    - SMS_PROVIDER=generic
 *    - SMS_API_URL=https://your-sms-provider.com/api/send
 *    - SMS_API_KEY=your_api_key
 * 
 * Note: If SMS_API_KEY is not set (e.g. initial setup / development on Render),
 * the service runs in "simulated" mode and logs the OTP to the Render console.
 */

async function sendSms(phone, message) {
  // Normalize phone to Bangladeshi format (e.g., 88017XXXXXXXX or 017XXXXXXXX)
  let cleanPhone = phone.replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '880' + cleanPhone.slice(1);
  } else if (!cleanPhone.startsWith('880')) {
    cleanPhone = '880' + cleanPhone;
  }

  const apiKey = process.env.SMS_API_KEY;
  const senderId = process.env.SMS_SENDER_ID || 'Packbang';
  const provider = (process.env.SMS_PROVIDER || 'generic').toLowerCase();

  // If no SMS API key is configured yet, run in simulated/dev mode
  if (!apiKey) {
    console.log('----------------------------------------------------');
    console.log(`[Packbang SMS - Simulated] Phone: +${cleanPhone}`);
    console.log(`[Packbang SMS - Message] ${message}`);
    console.log('To send real SMS, set SMS_API_KEY in Render environment variables.');
    console.log('----------------------------------------------------');
    return {
      success: true,
      mode: 'simulated',
      message: 'Simulated SMS logged to console. Connect SMS_API_KEY to send real SMS.'
    };
  }

  try {
    let res;
    if (provider === 'greenweb') {
      const url = `https://api.greenweb.com.bd/api.php?token=${encodeURIComponent(apiKey)}&to=${encodeURIComponent(cleanPhone)}&message=${encodeURIComponent(message)}`;
      res = await fetch(url, { method: 'POST' });
    } else if (provider === 'bulksmsbd') {
      const url = `https://bulksmsbd.net/api/smsapi?api_key=${encodeURIComponent(apiKey)}&type=text&number=${encodeURIComponent(cleanPhone)}&senderid=${encodeURIComponent(senderId)}&message=${encodeURIComponent(message)}`;
      res = await fetch(url, { method: 'POST' });
    } else {
      // Generic Gateway: POST JSON or query params
      const apiUrl = process.env.SMS_API_URL || 'https://api.greenweb.com.bd/api.php';
      res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          senderId,
          phone: cleanPhone,
          message
        })
      });
    }

    const data = await res.text();
    console.log(`[Packbang SMS - Sent Live] Phone: +${cleanPhone}, Response: ${data}`);
    return { success: true, mode: 'live', response: data };

  } catch (err) {
    console.error(`[Packbang SMS - Error] Failed to send SMS to +${cleanPhone}:`, err.message);
    return { success: false, mode: 'failed', error: err.message };
  }
}

module.exports = { sendSms };
