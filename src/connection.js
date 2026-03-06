const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const config = require('./config');
const { useMongoDBAuthState } = require('./mongoAuth');

const logger = pino({ level: 'silent' });

/**
 * Create and return a connected WhatsApp socket.
 * @param {'qr' | 'pairing'} method - Connection method
 * @param {string} [phoneNumber] - Phone number for pairing code
 * @param {object} [io] - Socket.io server instance for web dashboard
 * @returns {Promise<object>} The connected socket
 */
async function connectToWhatsApp(method, phoneNumber, io) {
    let state, saveCreds;

    if (config.mongoURI) {
        const mongoAuth = await useMongoDBAuthState('baileys_auth');
        state = mongoAuth.state;
        saveCreds = mongoAuth.saveCreds;
        console.log('📦 Using MongoDB for session persistence');
    } else {
        const multiFile = await useMultiFileAuthState(config.sessionFolder);
        state = multiFile.state;
        saveCreds = multiFile.saveCreds;
        console.log('📁 Using local filesystem for session persistence');
    }
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        browser: method === 'pairing'
            ? ['Chrome (Linux)', '', '']   // Required for pairing code to work
            : ['L-A COSMETICS Bot', 'Chrome', '120.0.0'],
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
    });

    // ─── Pairing Code ────────────────────────────────
    // Must be requested BEFORE the connection.update listener fires 'open'
    if (method === 'pairing' && phoneNumber && !sock.authState.creds.registered) {
        // Clean the phone number: remove +, spaces, dashes
        const cleanNumber = phoneNumber.replace(/[\s\-\+\(\)]/g, '');

        if (io) {
            io.emit('log', 'Demande du code de jumelage pour : ' + cleanNumber);
        }

        // Wait for the WebSocket to open before requesting pairing code
        await new Promise((resolve) => {
            const interval = setInterval(() => {
                if (sock.ws?.readyState === sock.ws?.OPEN) {
                    clearInterval(interval);
                    resolve();
                }
            }, 200);
            // Timeout after 15 seconds
            setTimeout(() => {
                clearInterval(interval);
                resolve();
            }, 15000);
        });

        try {
            const code = await sock.requestPairingCode(cleanNumber);
            console.log(`\n🔑 Code de jumelage: ${code}\n`);

            // Emit pairing code to web clients
            if (io) {
                io.emit('pairing-code', code);
            }
        } catch (err) {
            console.error('❌ Échec du code de jumelage:', err.message);
            if (io) {
                io.emit('error', 'Échec du code de jumelage: ' + err.message);
            }
        }
    }

    // ─── QR Code handling ────────────────────────────
    if (method === 'qr') {
        sock.ev.on('connection.update', async (update) => {
            const { qr } = update;
            if (qr) {
                try {
                    const qrDataUrl = await QRCode.toDataURL(qr, {
                        width: 300,
                        margin: 2,
                        color: { dark: '#000000', light: '#FFFFFF' },
                    });

                    if (io) {
                        io.emit('qr', qrDataUrl);
                    }

                    // Terminal fallback
                    const qrTerminal = require('qrcode-terminal');
                    qrTerminal.generate(qr, { small: true });
                    console.log('📷 QR Code generated — scan it or use the web dashboard');
                } catch (err) {
                    console.error('❌ QR generation error:', err.message);
                }
            }
        });
    }

    // ─── Save credentials on update ──────────────────
    sock.ev.on('creds.update', saveCreds);

    return sock;
}

module.exports = { connectToWhatsApp };
