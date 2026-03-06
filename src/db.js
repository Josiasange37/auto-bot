const mongoose = require('mongoose');

// Baileys Session Models
const SessionSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    data: { type: String, required: true }
});
const Session = mongoose.models.Session || mongoose.model('Session', SessionSchema);

// Auto-Reply Contact Tracking
const RepliedContactSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true },
    timestamp: { type: Number, required: true }
});
const RepliedContact = mongoose.models.RepliedContact || mongoose.model('RepliedContact', RepliedContactSchema);

/**
 * Attempts to connect to MongoDB, with a fallback for Render DNS SRV failures
 * @param {string} uri 
 */
async function connectDB(uri) {
    if (mongoose.connection.readyState >= 1) return;

    try {
        console.log('⏳ Attempting primary MongoDB connection...');
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log('✅ Connected to MongoDB');
    } catch (err) {
        console.warn(`⚠️ Primary connection failed: ${err.message}`);
        console.log('⏳ Attempting fallback standard connection string...');

        // Convert SRV string to standard string to bypass DNS resolution issues on free tiers
        if (uri.startsWith('mongodb+srv://')) {
            try {
                // Extract credentials and host
                const regex = /^mongodb\+srv:\/\/(.+):(.+)@([^/]+)\/?.*$/;
                const match = uri.match(regex);
                if (match) {
                    const user = encodeURIComponent(decodeURIComponent(match[1]));
                    const pass = encodeURIComponent(decodeURIComponent(match[2]));
                    const host = match[3];

                    // MongoDB Atlas standard connection format
                    const fallbackUri = `mongodb://${user}:${pass}@${host}:27017/whatsapp-bot?ssl=true&replicaSet=atlas-13ytd2-shard-0&authSource=admin&retryWrites=true&w=majority`;

                    await mongoose.connect(fallbackUri);
                    console.log('✅ Connected to MongoDB via Standard Fallback URI');
                    return;
                }
            } catch (fallbackErr) {
                console.error('❌ Fallback DB connection also failed:', fallbackErr.message);
                throw fallbackErr;
            }
        }
        throw err;
    }
}

module.exports = { Session, RepliedContact, connectDB };
