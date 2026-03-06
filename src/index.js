const { connectToWhatsApp } = require('./connection');
const { handleAutoReply, doReset, getRepliedCount } = require('./autoReply');
const config = require('./config');
const { handleGroupCommand, handleBotCommand } = require('./groupManager');
const startKeepAlive = require('./keepAlive'); // Import the keep-alive module

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// ─── Express + Socket.io Setup ────────────────────────
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' },
});

// Serve static frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// API endpoint for status
app.get('/api/status', (req, res) => {
    res.json({
        connected: botConnected,
        repliedContacts: getRepliedCount(),
        botName: config.botName,
        ownerNumber: config.ownerNumber,
    });
});

// ─── Bot State ────────────────────────────────────────
let sock = null;
let botConnected = false;

// ─── ASCII Banner ─────────────────────────────────────
function showBanner() {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   💄  L-A COSMETICS WhatsApp Bot  ✨                  ║
║                                                       ║
║   Powered by Baileys + Web Dashboard                  ║
║   Auto-reply • Group Management • Session Persist     ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
}

// ─── Connect Bot (called from web dashboard or startup) ──
async function startConnection(method, phoneNumber) {
    botConnected = false;
    io.emit('status', { state: 'connecting', method });

    sock = await connectToWhatsApp(method, phoneNumber, io);

    // ─── Connection status events ─────────────────────
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            botConnected = false;
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            console.log(
                `⚠️  Connection closed. ${shouldReconnect ? 'Reconnecting...' : 'Logged out.'}`
            );

            io.emit('status', {
                state: shouldReconnect ? 'reconnecting' : 'logged_out',
            });

            if (shouldReconnect) {
                // Auto-reconnect using saved session
                setTimeout(() => startConnection('qr', null), 3000);
            } else {
                io.emit('status', { state: 'logged_out' });
            }
        }

        if (connection === 'open') {
            botConnected = true;
            console.log('✅ Bot connected successfully!');
            io.emit('status', {
                state: 'connected',
                repliedContacts: getRepliedCount(),
            });
        }
    });

    // ─── Message handler ──────────────────────────────
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
            await handleGroupCommand(sock, msg);
            await handleAutoReply(sock, msg);
        }
    });
}

// ─── Socket.io: Handle web client events ─────────────
io.on('connection', (socket) => {
    console.log('🌐 Web client connected');

    // Send current status
    socket.emit('status', {
        state: botConnected ? 'connected' : 'disconnected',
        repliedContacts: getRepliedCount(),
    });

    // Client requests QR connection
    socket.on('connect-qr', () => {
        console.log('📷 Web client requested QR connection');
        startConnection('qr', null);
    });

    // Client requests pairing code connection
    socket.on('connect-pairing', (phoneNumber) => {
        console.log(`🔑 Web client requested pairing code for: ${phoneNumber}`);
        startConnection('pairing', phoneNumber);
    });

    // Client requests disconnect
    socket.on('disconnect-bot', async () => {
        if (sock) {
            await sock.logout();
            botConnected = false;
            io.emit('status', { state: 'disconnected' });
        }
    });

    // Client requests reset replies
    socket.on('reset-replies', () => {
        const count = doReset();
        io.emit('replies-reset', count);
        io.emit('status', {
            state: botConnected ? 'connected' : 'disconnected',
            repliedContacts: getRepliedCount(),
        });
    });

    socket.on('disconnect', () => {
        console.log('🌐 Web client disconnected');
    });
});

// ─── Start Server ─────────────────────────────────────
const PORT = process.env.PORT || 3000;

server.listen(PORT, async () => {
    showBanner();
    console.log(`🌐 Web Dashboard: http://localhost:${PORT}`);

    if (config.mongoURI) {
        const { connectDB } = require('./db');
        const { initializeAutoReplyDB } = require('./autoReply');
        try {
            console.log('\n⏳ Connecting to MongoDB...');
            await connectDB(config.mongoURI);
            await initializeAutoReplyDB();
            console.log('📱 MongoDB configuration found — auto-connecting bot...\n');
            startConnection('qr', null);
        } catch (err) {
            console.error('❌ Failed to connect to MongoDB:', err.message);
        }
    } else {
        console.log(`📂 Session stored locally in: ${config.sessionFolder}\n`);

        // Auto-reconnect if session exists locally
        const fs = require('fs');
        const sessionCredsPath = path.join(config.sessionFolder, 'creds.json');
        if (fs.existsSync(sessionCredsPath)) {
            console.log('📱 Existing local session found — auto-reconnecting...\n');
            startConnection('qr', null);
        } else {
            console.log('📱 No local session found — use the web dashboard to connect.\n');
        }
    }

    // Initialize the keep-alive ping system
    // Render typically provides RENDER_EXTERNAL_URL in production automatically
    const externalUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    startKeepAlive(externalUrl, PORT);
});
