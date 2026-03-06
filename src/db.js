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

async function connectDB(uri) {
    if (mongoose.connection.readyState >= 1) return;
    await mongoose.connect(uri);
    console.log('✅ Connecté à MongoDB / Connected to MongoDB');
}

module.exports = { Session, RepliedContact, connectDB };
