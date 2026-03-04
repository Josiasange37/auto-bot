const config = require('./config');
const { doReset, getRepliedCount } = require('./autoReply');

/**
 * Handle group management commands.
 * Only the bot owner can use these commands.
 * @param {object} sock - The WhatsApp socket
 * @param {object} msg - The incoming message object
 */
async function handleGroupCommand(sock, msg) {
    try {
        const remoteJid = msg.key.remoteJid;
        if (!remoteJid) return;

        // Get message text
        const messageContent = msg.message;
        if (!messageContent) return;

        const text =
            messageContent.conversation ||
            messageContent.extendedTextMessage?.text ||
            '';

        if (!text.startsWith(config.botPrefix)) return;

        // Parse command and arguments
        const args = text.slice(config.botPrefix.length).trim().split(/\s+/);
        const command = args.shift().toLowerCase();

        // Get sender
        const sender = msg.key.participant || msg.key.remoteJid;
        const senderNumber = sender.replace('@s.whatsapp.net', '');

        // Check if sender is the owner
        const isOwner = senderNumber === config.ownerNumber;
        const isGroup = remoteJid.endsWith('@g.us');

        // ─── Commands that work anywhere ──────────────
        switch (command) {
            // ── Reset replied contacts (owner only, works in DM or group) ──
            case 'resetreplies': {
                if (!isOwner) return;
                const count = doReset();
                await sock.sendMessage(remoteJid, {
                    text: `🔄 Auto-reply list cleared!\n${count} contacts were reset.\nNew messages will receive the welcome message again.`,
                });
                return;
            }

            // ── Bot status (owner only) ──
            case 'status': {
                if (!isOwner) return;
                const repliedCount = getRepliedCount();
                await sock.sendMessage(remoteJid, {
                    text: `📊 *${config.botName} Status*\n\n✅ Bot is online\n📩 Contacts auto-replied: ${repliedCount}\n🤖 Version: 1.0.0`,
                });
                return;
            }

            // ── Help command ──
            case 'help': {
                if (!isOwner) return;
                await sock.sendMessage(remoteJid, {
                    text: `🤖 *${config.botName} Commands*\n\n*General:*\n${config.botPrefix}help — Show this help\n${config.botPrefix}status — Bot status\n${config.botPrefix}resetreplies — Reset auto-reply list\n\n*Group Management:*\n${config.botPrefix}groupinfo — Group details\n${config.botPrefix}tagall [message] — Tag all members\n${config.botPrefix}kick @user — Remove member\n${config.botPrefix}promote @user — Make admin\n${config.botPrefix}demote @user — Remove admin\n${config.botPrefix}groupname [name] — Change group name\n${config.botPrefix}groupdesc [text] — Change description`,
                });
                return;
            }
        }

        // ─── Group-only commands ──────────────────────
        if (!isGroup) return;
        if (!isOwner) return;

        switch (command) {
            // ── Group Info ──
            case 'groupinfo': {
                try {
                    const metadata = await sock.groupMetadata(remoteJid);
                    await sock.sendMessage(remoteJid, {
                        text: `📋 *Group Info*\n\n*Name:* ${metadata.subject}\n*ID:* ${metadata.id}\n*Created by:* @${metadata.owner?.replace('@s.whatsapp.net', '') || 'Unknown'}\n*Members:* ${metadata.participants.length}\n*Admins:* ${metadata.participants.filter((p) => p.admin).length}\n*Description:*\n${metadata.desc || 'No description'}`,
                        mentions: metadata.owner ? [metadata.owner] : [],
                    });
                } catch (err) {
                    await sock.sendMessage(remoteJid, {
                        text: '❌ Failed to fetch group info.',
                    });
                }
                break;
            }

            // ── Tag All ──
            case 'tagall': {
                try {
                    const metadata = await sock.groupMetadata(remoteJid);
                    const participants = metadata.participants;
                    const customMsg = args.join(' ') || '📢 Attention everyone!';

                    let mentionText = `*${customMsg}*\n\n`;
                    const mentions = [];

                    participants.forEach((p) => {
                        const num = p.id.replace('@s.whatsapp.net', '');
                        mentionText += `@${num}\n`;
                        mentions.push(p.id);
                    });

                    await sock.sendMessage(remoteJid, {
                        text: mentionText,
                        mentions,
                    });
                } catch (err) {
                    await sock.sendMessage(remoteJid, {
                        text: '❌ Failed to tag members.',
                    });
                }
                break;
            }

            // ── Kick ──
            case 'kick': {
                const mentioned =
                    msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
                if (mentioned.length === 0) {
                    await sock.sendMessage(remoteJid, {
                        text: '⚠️ Tag the user(s) to kick.\nUsage: `!kick @user`',
                    });
                    break;
                }
                try {
                    await sock.groupParticipantsUpdate(remoteJid, mentioned, 'remove');
                    const names = mentioned
                        .map((j) => `@${j.replace('@s.whatsapp.net', '')}`)
                        .join(', ');
                    await sock.sendMessage(remoteJid, {
                        text: `👋 Removed: ${names}`,
                        mentions: mentioned,
                    });
                } catch (err) {
                    await sock.sendMessage(remoteJid, {
                        text: '❌ Failed to kick. Make sure the bot is an admin.',
                    });
                }
                break;
            }

            // ── Promote ──
            case 'promote': {
                const mentioned =
                    msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
                if (mentioned.length === 0) {
                    await sock.sendMessage(remoteJid, {
                        text: '⚠️ Tag the user(s) to promote.\nUsage: `!promote @user`',
                    });
                    break;
                }
                try {
                    await sock.groupParticipantsUpdate(remoteJid, mentioned, 'promote');
                    const names = mentioned
                        .map((j) => `@${j.replace('@s.whatsapp.net', '')}`)
                        .join(', ');
                    await sock.sendMessage(remoteJid, {
                        text: `⬆️ Promoted to admin: ${names}`,
                        mentions: mentioned,
                    });
                } catch (err) {
                    await sock.sendMessage(remoteJid, {
                        text: '❌ Failed to promote. Make sure the bot is an admin.',
                    });
                }
                break;
            }

            // ── Demote ──
            case 'demote': {
                const mentioned =
                    msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
                if (mentioned.length === 0) {
                    await sock.sendMessage(remoteJid, {
                        text: '⚠️ Tag the user(s) to demote.\nUsage: `!demote @user`',
                    });
                    break;
                }
                try {
                    await sock.groupParticipantsUpdate(remoteJid, mentioned, 'demote');
                    const names = mentioned
                        .map((j) => `@${j.replace('@s.whatsapp.net', '')}`)
                        .join(', ');
                    await sock.sendMessage(remoteJid, {
                        text: `⬇️ Demoted from admin: ${names}`,
                        mentions: mentioned,
                    });
                } catch (err) {
                    await sock.sendMessage(remoteJid, {
                        text: '❌ Failed to demote. Make sure the bot is an admin.',
                    });
                }
                break;
            }

            // ── Group Name ──
            case 'groupname': {
                const newName = args.join(' ');
                if (!newName) {
                    await sock.sendMessage(remoteJid, {
                        text: '⚠️ Provide a new name.\nUsage: `!groupname New Name`',
                    });
                    break;
                }
                try {
                    await sock.groupUpdateSubject(remoteJid, newName);
                    await sock.sendMessage(remoteJid, {
                        text: `✅ Group name changed to: *${newName}*`,
                    });
                } catch (err) {
                    await sock.sendMessage(remoteJid, {
                        text: '❌ Failed to change group name.',
                    });
                }
                break;
            }

            // ── Group Description ──
            case 'groupdesc': {
                const newDesc = args.join(' ');
                if (!newDesc) {
                    await sock.sendMessage(remoteJid, {
                        text: '⚠️ Provide a description.\nUsage: `!groupdesc New description`',
                    });
                    break;
                }
                try {
                    await sock.groupUpdateDescription(remoteJid, newDesc);
                    await sock.sendMessage(remoteJid, {
                        text: `✅ Group description updated!`,
                    });
                } catch (err) {
                    await sock.sendMessage(remoteJid, {
                        text: '❌ Failed to change group description.',
                    });
                }
                break;
            }
        }
    } catch (err) {
        console.error('❌ Group command error:', err.message);
    }
}

module.exports = { handleGroupCommand };
