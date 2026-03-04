const path = require('path');

const config = {
  // ─── Owner Configuration ───────────────────────────
  // Your WhatsApp number with country code (no + or spaces)
  // Example: '237612345678' for Cameroon
  ownerNumber: '237612345678',

  // ─── Paths ─────────────────────────────────────────
  sessionFolder: path.join(__dirname, '..', 'session'),
  dataFolder: path.join(__dirname, '..', 'data'),

  // ─── Bot Settings ──────────────────────────────────
  botPrefix: '!',
  botName: 'L-A COSMETICS Bot',

  // ─── Welcome / Auto-Reply Message ──────────────────
  welcomeMessage: `Hello 👋
Thank you for contacting *L-A COSMETICS* 💄✨

We appreciate your interest in our beauty products. Your message has been received, and we'll respond as soon as possible during our business hours.

🕒 *Working Hours:*
Mon–Sat: 8:00 AM – 10:00 PM

In the meantime, feel free to send:
✔ Product name
✔ Quantity
✔ Location for delivery

We look forward to serving you and helping you glow beautifully 💕`,
};

module.exports = config;
