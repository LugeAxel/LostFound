const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dns = require('dns');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, param, validationResult } = require('express-validator');
require('dotenv').config({ path: '../.env' });
const cron = require('node-cron');
const cloudinary = require('./config/cloudinary');

// 1. DNS FIX (For Atlas connection issues on restricted networks)
dns.setServers(['1.1.1.1', '8.8.8.8']);

const http = require('http');
const { Server } = require('socket.io');

const app = express();
app.set('trust proxy', 1);
const upload = require('./middleware/upload');
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

if (!JWT_SECRET) {
    console.error('❌ FATAL: JWT_SECRET is not set in .env');
    process.exit(1);
}

// ─────────────────────────────────────────────
// 2. SECURITY MIDDLEWARE
// ─────────────────────────────────────────────

// Security headers
app.use(helmet({
    crossOriginResourcePolicy: false
}));

// CORS — restrict to frontend origin in production
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:4173',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow Postman/mobile apps/no-origin requests
        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        console.warn(`❌ Blocked by CORS: ${origin}`);

        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

// Socket.io initialization moved to after middleware

// Body parser with size limit (prevents oversized payloads)
app.use(express.json({ limit: '5mb' }));

// Global rate limiter
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Reasonable limit
    skip: (req) => req.originalUrl.startsWith('/socket.io'), // Skip socket.io polling
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use(globalLimiter);

// Strict rate limiter for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20, // max 20 login attempts per 15 min
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many login attempts, please try again later.' }
});

// ─────────────────────────────────────────────
// 3. DATABASE CONNECTION
// ─────────────────────────────────────────────
const connectDB = async () => {
    try {
        console.log('⏳ Connecting to MongoDB Atlas...');
        mongoose.set('bufferCommands', false);

        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
        });

        console.log('✅ MongoDB Connected Successfully!');
    } catch (err) {
        console.error('❌ MongoDB Connection Failed:', err.message);
    }
};

connectDB();

// ─────────────────────────────────────────────
// 4. SCHEMAS & MODELS
// ─────────────────────────────────────────────
const UserSchema = new mongoose.Schema({
    nama: { type: String, required: true, trim: true, maxlength: 100 },
    nisn: { type: String, trim: true, maxlength: 20 },
    nis: { type: String, trim: true, maxlength: 20 },
    jurusan: { type: String, trim: true, maxlength: 100 },
    ttl: { type: String, trim: true, maxlength: 100 },
    agama: { type: String, trim: true, maxlength: 50 },
    gender: { type: String, trim: true, maxlength: 20 },
    email: { type: String, trim: true, lowercase: true, maxlength: 100 },
    password: { type: String, select: false }, // hidden by default in queries
    role: { type: String, default: 'student', enum: ['student', 'admin'] },
    createdAt: { type: Date, default: Date.now }
});

// Use partial indexes to allow multiple users to have 'null' or missing values.
// Only enforces uniqueness if the field is a string.
UserSchema.index({ nisn: 1 }, {
    unique: true,
    partialFilterExpression: { nisn: { $type: "string" } }
});
UserSchema.index({ email: 1 }, {
    unique: true,
    partialFilterExpression: { email: { $type: "string" } }
});

const User = mongoose.model('User', UserSchema);

const NotificationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['message', 'claim', 'resolved', 'complaint'], required: true },
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    text: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});
const Notification = mongoose.model('Notification', NotificationSchema);

const ItemSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 200 },
    location: { type: String, required: true, trim: true, maxlength: 200 },
    category: { type: String, trim: true, maxlength: 50, default: 'Others' },
    status: { type: String, default: 'Available', enum: ['Available', 'On Progress', 'Returned'] },
    type: { type: String, required: true, enum: ['found', 'lost'], lowercase: true },
    reportedAt: { type: Date, default: Date.now },
    imageUrl: { type: String, maxlength: 500 },
    description: { type: String, trim: true, maxlength: 500 },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Live Location
    coordinates: {
        latitude: { type: Number },
        longitude: { type: Number }
    },
    // Claim Data
    claimer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    claimPhoto: { type: String, maxlength: 3000000 },
    claimNotes: { type: String, trim: true, maxlength: 500 },
    claimedAt: { type: Date },
    // Chat System
    messages: [{
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
    }],
    // Complaint System
    complaints: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
    }],
    resolvedAt: { type: Date }
});

const Item = mongoose.model('Item', ItemSchema);

ItemSchema.index({ status: 1 });
ItemSchema.index({ type: 1 });
ItemSchema.index({ reportedAt: -1 });
ItemSchema.index({ reporter: 1 });

// Sync indexes once connection is open
mongoose.connection.once('open', async () => {
    try {
        await User.syncIndexes();
        await Item.syncIndexes();
        console.log('✅ Database indexes synchronized');
    } catch (err) {
        console.error('❌ Index synchronization failed:', err.message);
    }
});

// ─────────────────────────────────────────────
// 5. AUTH HELPERS
// ─────────────────────────────────────────────
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Validation error handler
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(e => e.msg)
        });
    }
    next();
};

// ─────────────────────────────────────────────
// 6. AUTH MIDDLEWARE
// ─────────────────────────────────────────────
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Token is valid but user no longer exists.'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token has expired. Please login again.'
            });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token.'
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Authentication error.'
        });
    }
};

// ─────────────────────────────────────────────
// 7. ROUTES
// ─────────────────────────────────────────────

// Health check (public)
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        readyState: mongoose.connection.readyState
    });
});

// ── AUTH ROUTES ──────────────────────────────

// QR Code login (existing flow)
app.post('/api/login',
    authLimiter,
    [
        body('nisn').trim().notEmpty().withMessage('NISN is required')
            .isLength({ max: 20 }).withMessage('NISN too long')
            .matches(/^[0-9]+$/).withMessage('NISN must be numeric'),
        body('nama').trim().notEmpty().withMessage('Name is required')
            .isLength({ max: 100 }).withMessage('Name too long'),
        body('nis').optional().trim().isLength({ max: 20 }),
        body('jurusan').optional().trim().isLength({ max: 100 }),
        body('ttl').optional().trim().isLength({ max: 100 }),
        body('agama').optional().trim().isLength({ max: 50 }),
        body('gender').optional().trim().isLength({ max: 20 }),
    ],
    handleValidationErrors,
    async (req, res) => {
        console.log('📥 QR Login request for NISN:', req.body.nisn);

        try {
            if (mongoose.connection.readyState !== 1) {
                return res.status(503).json({
                    success: false,
                    message: 'Database is not connected. Please check your internet or Atlas IP whitelist.'
                });
            }

            const { nisn, nama, nis, jurusan, ttl, agama, gender } = req.body;

            let user = await User.findOne({ nisn });

            if (!user) {
                console.log('✨ New student detected, creating profile...');
                user = new User({
                    nama, nisn, nis, jurusan, ttl, agama, gender
                });
                await user.save();
            } else {
                console.log('👋 Welcome back,', user.nama);
            }

            const token = generateToken(user._id);

            res.json({
                success: true,
                token,
                user: {
                    _id: user._id,
                    nama: user.nama,
                    nisn: user.nisn,
                    nis: user.nis,
                    jurusan: user.jurusan,
                    role: user.role,
                    email: user.email || null
                }
            });
        } catch (error) {
            console.error('🔥 QR Login Error:', error.message);
            res.status(500).json({ success: false, message: 'Server error during login.' });
        }
    }
);

// Email registration (set email + password for existing QR user or new)
app.post('/api/auth/register-email',
    authLimiter,
    [
        body('email').trim().isEmail().withMessage('Valid email is required')
            .isLength({ max: 100 }).withMessage('Email too long'),
        body('password').isLength({ min: 6, max: 100 }).withMessage('Password must be at least 6 characters'),
        body('nama').trim().notEmpty().withMessage('Name is required')
            .isLength({ max: 100 }).withMessage('Name too long'),
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            if (mongoose.connection.readyState !== 1) {
                return res.status(503).json({ success: false, message: 'Database not connected.' });
            }

            const { email, password, nama } = req.body;

            // Check if email already exists
            const existingUser = await User.findOne({ email }).select('+password');
            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: 'An account with this email already exists. Please login instead.'
                });
            }

            const salt = await bcrypt.genSalt(12);
            const hashedPassword = await bcrypt.hash(password, salt);

            const user = new User({
                nama,
                email,
                password: hashedPassword
            });
            await user.save();

            const token = generateToken(user._id);

            console.log('✨ New email user registered:', email);

            res.status(201).json({
                success: true,
                token,
                user: {
                    _id: user._id,
                    nama: user.nama,
                    nisn: user.nisn || null,
                    nis: user.nis || null,
                    jurusan: user.jurusan || null,
                    role: user.role,
                    email: user.email
                }
            });
        } catch (error) {
            console.error('🔥 Email Register Error:', error.message);
            if (error.code === 11000) {
                return res.status(409).json({ success: false, message: 'Email already registered.' });
            }
            res.status(500).json({ success: false, message: 'Server error during registration.' });
        }
    }
);

// Email login
app.post('/api/auth/login-email',
    authLimiter,
    [
        body('email').trim().isEmail().withMessage('Valid email is required'),
        body('password').notEmpty().withMessage('Password is required'),
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            if (mongoose.connection.readyState !== 1) {
                return res.status(503).json({ success: false, message: 'Database not connected.' });
            }

            const { email, password } = req.body;

            const user = await User.findOne({ email }).select('+password');
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password.'
                });
            }

            if (!user.password) {
                return res.status(401).json({
                    success: false,
                    message: 'This account was created via QR scan. Please set a password first or login with QR.'
                });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password.'
                });
            }

            const token = generateToken(user._id);
            console.log('👋 Email login:', email);

            res.json({
                success: true,
                token,
                user: {
                    _id: user._id,
                    nama: user.nama,
                    nisn: user.nisn || null,
                    nis: user.nis || null,
                    jurusan: user.jurusan || null,
                    role: user.role,
                    email: user.email
                }
            });
        } catch (error) {
            console.error('🔥 Email Login Error:', error.message);
            res.status(500).json({ success: false, message: 'Server error during login.' });
        }
    }
);

// Verify token + get current user (for session persistence check)
app.get('/api/auth/me', authMiddleware, (req, res) => {
    res.json({
        success: true,
        user: {
            _id: req.user._id,
            nama: req.user.nama,
            nisn: req.user.nisn || null,
            nis: req.user.nis || null,
            jurusan: req.user.jurusan || null,
            role: req.user.role,
            email: req.user.email || null
        }
    });
});

// ── ITEM ROUTES (all protected) ──────────────

// Get all items (public feed for dashboard)
app.get('/api/items', authMiddleware, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const items = await Item.find()
            .populate('reporter', 'nama nisn jurusan')
            .populate('claimer', 'nama')
            .sort({ reportedAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Item.countDocuments();

        res.json({
            items,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalItems: total
        });

    } catch (error) {
        console.error('Error fetching items:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch items.' });
    }
});

// Notifications (Mock for now to prevent 404s)
app.get('/api/notifications', authMiddleware, (req, res) => {
    res.json([]);
});
app.post('/api/notifications/:id/read', authMiddleware, (req, res) => {
    res.json({ success: true });
});

// Get MY reports only (scoped to authenticated user)
app.get('/api/items/mine', authMiddleware, async (req, res) => {
    try {
        const items = await Item.find({ reporter: req.user._id })
            .populate('reporter', 'nama nisn jurusan')
            .populate('claimer', 'nama')
            .sort({ reportedAt: -1 });
        res.json(items);
    } catch (error) {
        console.error('Error fetching my items:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch your reports.' });
    }
});

// Get single item
app.get('/api/items/:id', authMiddleware, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid item ID format' });
        }
        const item = await Item.findById(req.params.id)
            .populate('reporter', 'nama nisn jurusan')
            .populate('claimer', 'nama');
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }
        res.json(item);
    } catch (error) {
        console.error('Error fetching item:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch item.' });
    }
});

// Create new item (reporter is always the authenticated user)
app.post('/api/items',
    authMiddleware,
    upload.single('image'),
    [
        body('name').trim().notEmpty().withMessage('Item name is required')
            .isLength({ max: 200 }).withMessage('Item name too long'),
        body('location').trim().notEmpty().withMessage('Location is required')
            .isLength({ max: 200 }).withMessage('Location too long'),
        body('category').optional().trim().isLength({ max: 50 }),
        body('type').trim().notEmpty().isIn(['found', 'lost']).withMessage('Type must be found or lost'),
        body('description').optional().trim().isLength({ max: 500 }).withMessage('Description too long'),
        body('imageUrl').optional().isLength({ max: 3000000 }).withMessage('Image too large'),
        body('coordinates').optional({ nullable: true }),
        body('coordinates').custom((value) => {
            if (!value) return true;
            try {
                const parsed = typeof value === 'string' ? JSON.parse(value) : value;
                if (typeof parsed !== 'object') throw new Error('Must be an object');
                if (parsed.latitude && (parsed.latitude < -90 || parsed.latitude > 90)) throw new Error('Invalid latitude');
                if (parsed.longitude && (parsed.longitude < -180 || parsed.longitude > 180)) throw new Error('Invalid longitude');
            } catch (e) {
                throw new Error('Invalid coordinates format');
            }
            return true;
        }),
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { name, location, category, type, description } = req.body;
            let coordinates;
            if (req.body.coordinates) {
                try {
                    coordinates = typeof req.body.coordinates === 'string' ? JSON.parse(req.body.coordinates) : req.body.coordinates;
                } catch (e) {
                    console.error('Failed to parse coordinates');
                }
            }

            const imageUrl = req.file ? req.file.path : null;

            const newItemData = {
                name,
                location,
                category: category || 'Others',
                type: type.toLowerCase(),
                description,
                imageUrl,
                reporter: req.user._id, // Always use authenticated user's ID
            };

            // Only assign coordinates if both latitude and longitude are valid numbers
            if (coordinates && typeof coordinates.latitude === 'number' && typeof coordinates.longitude === 'number') {
                newItemData.coordinates = {
                    latitude: coordinates.latitude,
                    longitude: coordinates.longitude
                };
            }

            const newItem = new Item(newItemData);
            await newItem.save();
            res.status(201).json({ success: true, item: newItem });
        } catch (error) {
            console.error('Error creating item:', error.message);
            res.status(500).json({ success: false, message: 'Failed to create report.' });
        }
    }
);

// Claim an item
// Start claim (Change status to On Progress)
app.post('/api/items/:id/start-claim',
    authMiddleware,
    async (req, res) => {
        try {
            const item = await Item.findById(req.params.id);
            if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
            if (item.status !== 'Available') return res.status(400).json({ success: false, message: 'Item is already being claimed or returned' });

            if (item.reporter.toString() === req.user._id.toString()) {
                return res.status(400).json({ success: false, message: 'You cannot claim your own item' });
            }

            item.status = 'On Progress';
            item.claimer = req.user._id;
            await item.save();

            // Notify reporter
            const notif = new Notification({
                user: item.reporter,
                type: 'claim',
                item: item._id,
                text: `Someone wants to claim your item: ${item.name}`
            });
            await notif.save();
            io.to(`user-${item.reporter}`).emit('notification', notif);

            res.json({ success: true, item });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
);

// Chat in item
app.post('/api/items/:id/chat',
    authMiddleware,
    async (req, res) => {
        try {
            const text = req.body.text?.trim();

            if (!text || text.length > 1000) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid message'
                });
            }

            const item = await Item.findById(req.params.id);
            if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

            // Only founder (reporter) and claimer can chat
            const isReporter = item.reporter.toString() === req.user._id.toString();
            const isClaimer = item.claimer?.toString() === req.user._id.toString();

            if (!isReporter && !isClaimer) {
                return res.status(403).json({ success: false, message: 'Only founder and claimer can chat' });
            }

            item.messages.push({
                sender: req.user._id,
                text
            });
            await item.save();

            // Notify recipient
            const recipientId = isReporter ? item.claimer : item.reporter;
            if (recipientId) {
                const notif = new Notification({
                    user: recipientId,
                    type: 'message',
                    item: item._id,
                    text: `New message from ${isReporter ? 'Founder' : 'Claimer'} for item: ${item.name}`
                });
                await notif.save();
                io.to(`user-${recipientId}`).emit('notification', notif);
            }

            // Emit to chat room
            io.to(`item-${item._id}`).emit('new-message', {
                itemId: item._id,
                message: item.messages[item.messages.length - 1]
            });

            res.json({ success: true, messages: item.messages });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
);

// File a complaint
app.post('/api/items/:id/complaint',
    authMiddleware,
    async (req, res) => {
        try {
            const { reason } = req.body;
            const item = await Item.findById(req.params.id);
            if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

            item.complaints.push({
                user: req.user._id,
                reason
            });
            await item.save();

            // Notify founder about the complaint
            await Notification.create({
                user: item.reporter,
                type: 'complaint',
                item: item._id,
                text: `Seseorang telah mengajukan komplain kepemilikan untuk barang "${item.name}".`
            });

            res.json({ success: true, message: 'Complaint filed' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
);

// Background task: Cleanup returned items after 2 days if no complaints
setInterval(async () => {
    try {
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
        const itemsToDelete = await Item.find({
            status: 'Returned',
            claimedAt: { $lte: twoDaysAgo },
            complaints: { $size: 0 }
        });

        if (itemsToDelete.length > 0) {
            console.log(`🧹 Cleaning up ${itemsToDelete.length} old returned items...`);
            await Item.deleteMany({
                _id: { $in: itemsToDelete.map(i => i._id) }
            });
        }
    } catch (error) {
        console.error('Error during cleanup task:', error.message);
    }
}, 6 * 60 * 60 * 1000); // Check every 6 hours

app.post('/api/items/:id/claim',
    authMiddleware,
    [
        param('id').isMongoId().withMessage('Invalid item ID'),
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { claimPhoto, claimNotes } = req.body;
            const itemId = req.params.id;

            const item = await Item.findById(itemId);
            if (!item) {
                return res.status(404).json({ success: false, message: 'Item not found' });
            }

            // Status check
            if (item.status !== 'Available' && item.status !== 'On Progress') {
                return res.status(400).json({ success: false, message: 'Item is not available for claim' });
            }

            // Reporter check - using toString() since reporter is an ObjectId
            if (item.reporter.toString() === req.user._id.toString()) {
                return res.status(400).json({ success: false, message: 'You cannot claim your own item' });
            }

            // Update item status and claim details
            item.status = 'Returned';
            item.claimer = req.user._id;
            item.claimPhoto = claimPhoto;
            item.claimNotes = claimNotes;
            item.claimedAt = new Date();

            await item.save();

            return res.json({
                success: true,
                message: 'Item claimed successfully! Proof submitted.'
            });
        } catch (error) {
            console.error('Error claiming item:', error.message);
            return res.status(500).json({
                success: false,
                message: 'Failed to claim item.'
            });
        }
    }
);

// Stats (protected)
app.get('/api/stats', authMiddleware, async (req, res) => {
    try {
        const currentlyLost = await Item.countDocuments({
            type: 'lost',
            status: 'Available'
        });
        const foundToday = await Item.countDocuments({
            type: 'found',
            reportedAt: { $gte: new Date().setHours(0, 0, 0, 0) }
        });
        const returnedAllTime = await Item.countDocuments({ status: 'Returned' });

        res.json({ currentlyLost, foundToday, returnedAllTime });
    } catch (error) {
        console.error('Error fetching stats:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch stats.' });
    }
});

// ── CATCH-ALL ────────────────────────────────
// Handle 404 for unknown API routes
app.use('/api/{*path}', (req, res) => {
    res.status(404).json({ success: false, message: 'API route not found.' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('💥 Unhandled Error Stack:', err.stack || err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ─────────────────────────────────────────────
// 8. START SERVER
// ─────────────────────────────────────────────
// Resolve claim (Founder decides)
app.post('/api/items/:id/resolve',
    authMiddleware,
    async (req, res) => {
        try {
            const { userId } = req.body;
            const item = await Item.findById(req.params.id);
            if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

            if (item.reporter.toString() !== req.user._id.toString()) {
                return res.status(403).json({ success: false, message: 'Only founder can resolve' });
            }

            item.status = 'Returned';
            item.claimer = userId;
            item.resolvedAt = new Date();
            await item.save();
            res.json({ success: true, message: 'Item successfully resolved' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
);

// Notifications routes
app.get('/api/notifications', authMiddleware, async (req, res) => {
    try {
        const notifs = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(20);
        res.json(notifs);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/notifications/:id/read', authMiddleware, async (req, res) => {
    try {
        await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { isRead: true });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ─────────────────────────────────────────────
// 10. SOCKET.IO & SERVER START
// ─────────────────────────────────────────────

const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            console.warn(`❌ Socket blocked by CORS: ${origin}`);
            return callback(new Error('Socket CORS blocked'));
        },
        methods: ['GET', 'POST'],
        credentials: true
    },
    allowEIO3: true
});

io.on('connection', (socket) => {
    console.log('🔌 New socket connection:', socket.id);

    socket.on('join-user', (userId) => {
        socket.join(`user-${userId}`);
        console.log(`👤 User joined room: user-${userId}`);
    });

    socket.on('join-item', (itemId) => {
        socket.join(`item-${itemId}`);
        console.log(`📦 Joined item room: item-${itemId}`);
    });

    socket.on('disconnect', () => {
        console.log('🔌 Socket disconnected:', socket.id);
    });
});

// ─────────────────────────────────────────────
// 11. CRON JOBS (Auto Cleanup)
// ─────────────────────────────────────────────
// Run every hour
cron.schedule('0 * * * *', async () => {
    console.log('🧹 Running Auto-Cleanup Job...');
    try {
        const now = new Date();
        const tenDaysAgo = new Date(new Date().setDate(new Date().getDate() - 10));
        const twoDaysAgo = new Date(new Date().setDate(new Date().getDate() - 2));

        // 1. Delete items not returned and older than 10 days
        const expiredUnclaimed = await Item.find({
            status: { $ne: 'Returned' },
            reportedAt: { $lte: tenDaysAgo }
        });

        // 2. Delete items returned and resolved older than 2 days
        const expiredReturned = await Item.find({
            status: 'Returned',
            resolvedAt: { $lte: twoDaysAgo }
        });

        const itemsToDelete = [...expiredUnclaimed, ...expiredReturned];

        if (itemsToDelete.length > 0) {
            console.log(`🗑️ Found ${itemsToDelete.length} items to auto-delete.`);
            
            for (const item of itemsToDelete) {
                // Delete image from Cloudinary
                if (item.imageUrl && item.imageUrl.includes('cloudinary')) {
                    try {
                        const urlParts = item.imageUrl.split('/');
                        const fileWithExt = urlParts[urlParts.length - 1];
                        const publicId = `lost-found-items/${fileWithExt.split('.')[0]}`;
                        await cloudinary.uploader.destroy(publicId);
                    } catch (cloudinaryErr) {
                        console.error('Failed to delete Cloudinary image:', cloudinaryErr.message);
                    }
                }

                // Notify reporter
                await Notification.create({
                    user: item.reporter,
                    type: 'message',
                    item: null,
                    text: `Pemberitahuan Sistem: Laporan "${item.name}" Anda telah dihapus otomatis sesuai kebijakan retensi (10 hari belum kembali / 2 hari setelah dikembalikan).`
                });

                await Item.findByIdAndDelete(item._id);
            }
            console.log(`✅ Successfully deleted ${itemsToDelete.length} items.`);
        }
    } catch (error) {
        console.error('❌ Auto-Cleanup Job failed:', error.message);
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
});
