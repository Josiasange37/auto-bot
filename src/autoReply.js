const fs = require('fs');
const path = require('path');
const config = require('./config');

const REPLIED_FILE = path.join(config.dataFolder, 'replied-contacts.json');

// ─── Load / Save replied contacts ──────────────────
function loadRepliedContacts() {
    try {
        if (fs.existsSync(REPLIED_FILE)) {
            const data = JSON.parse(fs.readFileSync(REPLIED_FILE, 'utf-8'));
            if (Array.isArray(data)) {
                const obj = {};
                const now = Date.now();
                data.forEach(num => obj[num] = now);
                return obj;
            }
            return data || {};
        }
    } catch (err) {
        console.error('⚠️  Error loading replied contacts:', err.message);
    }
    return {};
}

function saveRepliedContacts(repliedObj) {
    try {
        if (!fs.existsSync(config.dataFolder)) {
            fs.mkdirSync(config.dataFolder, { recursive: true });
        }
        fs.writeFileSync(REPLIED_FILE, JSON.stringify(repliedObj, null, 2));
    } catch (err) {
        console.error('⚠️  Error saving replied contacts:', err.message);
    }
}

function resetRepliedContacts() {
    const emptyObj = {};
    saveRepliedContacts(emptyObj);
    return emptyObj;
}

// ─── The replied contacts dictionary (in-memory + persisted) ──
let repliedContacts = loadRepliedContacts();

/**
 * Handle incoming message for auto-reply.
 * Sends welcome message once per contact per day (24 hours).
 * @param {object} sock - The WhatsApp socket
 * @param {object} msg - The incoming message object
 */
async function handleAutoReply(sock, msg) {
    try {
        const remoteJid = msg.key.remoteJid;

        // Skip if no remote JID
        if (!remoteJid) return;

        // Skip group messages — only reply to private DMs
        if (remoteJid.endsWith('@g.us')) return;

        // Skip status broadcasts
        if (remoteJid === 'status@broadcast') return;

        // Skip messages from self
        if (msg.key.fromMe) return;

        // Skip if no actual message content (reactions, receipts, etc.)
        const messageContent = msg.message;
        if (!messageContent) return;

        // Skip protocol messages (reactions, polls, edits, deletes)
        if (
            messageContent.protocolMessage ||
            messageContent.reactionMessage ||
            messageContent.editedMessage
        ) {
            return;
        }

        // Get sender number (without @s.whatsapp.net)
        const senderNumber = remoteJid.replace('@s.whatsapp.net', '');

        const now = Date.now();
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

        // Skip if we already replied to this contact within the last 24 hours
        if (repliedContacts[senderNumber]) {
            const lastReplyTime = repliedContacts[senderNumber];
            if (now - lastReplyTime < TWENTY_FOUR_HOURS) {
                return; // Sent within the last 24h, skip
            }
        }

        // Send the welcome message
        await sock.sendMessage(remoteJid, { text: config.welcomeMessage });

        // Mark as replied with current timestamp
        repliedContacts[senderNumber] = now;
        saveRepliedContacts(repliedContacts);

        console.log(`✅ Auto-reply sent to: ${senderNumber}`);
    } catch (err) {
        console.error('❌ Auto-reply error:', err.message);
    }
}

/**
 * Reset the replied contacts list.
 * @returns {number} Number of contacts that were cleared
 */
function doReset() {
    const count = Object.keys(repliedContacts).length;
    repliedContacts = resetRepliedContacts();
    console.log(`🔄 Cleared ${count} replied contacts`);
    return count;
}

/**
 * Get the count of replied contacts.
 */
function getRepliedCount() {
    return Object.keys(repliedContacts).length;
}

module.exports = { handleAutoReply, doReset, getRepliedCount };
