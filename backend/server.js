const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dns = require('dns');
require('dotenv').config({ path: '../.env' });

// 1. DNS FIX (For Atlas connection issues on restricted networks)
dns.setServers(['1.1.1.1', '8.8.8.8']);

const app = express();
const PORT = process.env.PORT || 5000;

// 2. MIDDLEWARE
app.use(cors());
app.use(express.json());

// 3. DATABASE CONNECTION
const connectDB = async () => {
    try {
        console.log('⏳ Connecting to MongoDB Atlas...');

        // Disable buffering so we get immediate errors if not connected
        mongoose.set('bufferCommands', false);

        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
        });

        console.log('✅ MongoDB Connected Successfully!');
    } catch (err) {
        console.error('❌ MongoDB Connection Failed:', err.message);
        // We don't exit the process so the server can still respond with errors to the frontend
    }
};

connectDB();

// 4. SCHEMAS & MODELS
const UserSchema = new mongoose.Schema({
    nama: String,
    nisn: { type: String, unique: true },
    nis: String,
    jurusan: String,
    ttl: String,
    agama: String,
    gender: String,
    role: { type: String, default: 'student' }
});

const User = mongoose.model('User', UserSchema);

const ItemSchema = new mongoose.Schema({
    name: String,
    location: String,
    category: String,
    status: { type: String, default: 'Available' },
    type: { type: String, required: true },
    reportedAt: { type: Date, default: Date.now },
    imageUrl: String,
    description: String,
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const Item = mongoose.model('Item', ItemSchema);

// 5. ROUTES
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        readyState: mongoose.connection.readyState
    });
});

app.get('/api/login', (req, res) => {
    res.send('API Login is working, but it only accepts POST requests from the app.');
});

app.post('/api/login', async (req, res) => {
    console.log('📥 Received login request:', req.body);

    try {
        // Check DB connection before query
        if (mongoose.connection.readyState !== 1) {
            console.error('❌ Login failed: Database not connected');
            return res.status(503).json({
                success: false,
                message: 'Database is not connected. Please check your internet or Atlas IP whitelist.'
            });
        }

        const { nisn } = req.body;
        if (!nisn) {
            return res.status(400).json({ success: false, message: 'NISN is required' });
        }

        let user = await User.findOne({ nisn });

        if (!user) {
            console.log('✨ New student detected, creating profile...');
            user = new User(req.body);
            await user.save();
        } else {
            console.log('👋 Welcome back,', user.nama);
        }

        res.json({ success: true, user });
    } catch (error) {
        console.error('🔥 Server Error during login:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/items', async (req, res) => {
    try {
        const items = await Item.find().populate('reporter').sort({ reportedAt: -1 });
        res.json(items);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/items', async (req, res) => {
    try {
        const newItem = new Item(req.body);
        await newItem.save();
        res.json({ success: true, item: newItem });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const currentlyLost = await Item.countDocuments({ type: 'Lost', status: 'Available' });
        const foundToday = await Item.countDocuments({
            type: 'Found',
            reportedAt: { $gte: new Date().setHours(0, 0, 0, 0) }
        });
        const returnedAllTime = await Item.countDocuments({ status: 'Returned' });

        res.json({ currentlyLost, foundToday, returnedAllTime });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 6. START SERVER
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📡 Use http://localhost:${PORT}/api/health to check status`);
});
