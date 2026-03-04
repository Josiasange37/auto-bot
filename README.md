# 💄 L-A COSMETICS WhatsApp Bot

A WhatsApp bot built with **Baileys** for L-A COSMETICS. Features automatic welcome messages, session persistence, and group management commands.

## ✨ Features

- **🔗 Dual Auth** — Connect via QR code or Pairing code
- **💾 Session Persistence** — Reconnects automatically on restart (no re-scanning)
- **💬 Auto-Reply** — Sends welcome message once per new contact (like WhatsApp Business)
- **👥 Group Management** — Info, tag all, kick, promote, demote, rename, update description

## 🚀 Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Configure your owner number
Edit `src/config.js` and set your WhatsApp number:
```js
ownerNumber: '237XXXXXXXXX',  // Your number with country code
```

### 3. Start the bot
```bash
npm start
```

### 4. Connect
- Choose **QR Code** or **Pairing Code**
- Scan/enter the code on your phone
- Done! The bot will auto-reconnect on future restarts.

## 📋 Commands

| Command | Description | Where |
|---------|-------------|-------|
| `!help` | Show all commands | Anywhere |
| `!status` | Bot status info | Anywhere |
| `!resetreplies` | Clear auto-reply list | Anywhere |
| `!groupinfo` | Group details | Group |
| `!tagall [msg]` | Mention all members | Group |
| `!kick @user` | Remove member | Group |
| `!promote @user` | Make admin | Group |
| `!demote @user` | Remove admin | Group |
| `!groupname [name]` | Rename group | Group |
| `!groupdesc [text]` | Update description | Group |

> All commands are **owner-only** (configured in `config.js`).

## 📁 Project Structure

```
la-cosmetics-bot/
├── src/
│   ├── index.js         # Main entry point
│   ├── config.js        # Configuration
│   ├── connection.js    # WhatsApp connection (QR/Pairing)
│   ├── autoReply.js     # Auto-reply engine
│   └── groupManager.js  # Group management commands
├── session/             # Auth session (auto-created)
├── data/                # Replied contacts tracking
└── package.json
```

## 📌 Notes

- The **session/** folder stores your login. Delete it to re-authenticate.
- The auto-reply sends **once per contact**. Use `!resetreplies` to clear the list.
- The bot must be a **group admin** for kick/promote/demote commands.
