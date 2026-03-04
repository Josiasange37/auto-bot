const fs = require('fs');
const path = require('path');
const config = require('./config');

const REPLIED_FILE = path.join(config.dataFolder, 'replied-contacts.json');

// ─── Load / Save replied contacts ──────────────────
function loadRepliedContacts() {
    try {
        if (fs.existsSync(REPLIED_FILE)) {
            const data = JSON.parse(fs.readFileSync(REPLIED_FILE, 'utf-8'));
            return new Set(data);
        }
    } catch (err) {
        console.error('⚠️  Error loading replied contacts:', err.message);
    }
    return new Set();
}

function saveRepliedContacts(repliedSet) {
    try {
        // Ensure data folder exists
        if (!fs.existsSync(config.dataFolder)) {
            fs.mkdirSync(config.dataFolder, { recursive: true });
        }
        fs.writeFileSync(REPLIED_FILE, JSON.stringify([...repliedSet], null, 2));
    } catch (err) {
        console.error('⚠️  Error saving replied contacts:', err.message);
    }
}

function resetRepliedContacts() {
    const emptySet = new Set();
    saveRepliedContacts(emptySet);
    return emptySet;
}

// ─── The replied contacts set (in-memory + persisted) ──
let repliedContacts = loadRepliedContacts();

/**
 * Handle incoming message for auto-reply.
 * Sends welcome message once per contact.
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

        // Skip if we already replied to this contact
        if (repliedContacts.has(senderNumber)) return;

        // Send the welcome message
        await sock.sendMessage(remoteJid, { text: config.welcomeMessage });

        // Mark as replied
        repliedContacts.add(senderNumber);
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
    const count = repliedContacts.size;
    repliedContacts = resetRepliedContacts();
    console.log(`🔄 Cleared ${count} replied contacts`);
    return count;
}

/**
 * Get the count of replied contacts.
 */
function getRepliedCount() {
    return repliedContacts.size;
}

module.exports = { handleAutoReply, doReset, getRepliedCount };
