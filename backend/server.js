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
const { cache, invalidateCache } = require('./middleware/cache');

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
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = [
    ...(isProduction ? [] : [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:4173',
    ]),
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

// Strict rate limiter for heavy endpoints
const heavyEndpointLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests to this endpoint.' }
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
    type: { type: String, enum: ['message', 'claim', 'resolved', 'complaint', 'system'], required: true },
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
ItemSchema.index({ type: 1, status: 1 });
ItemSchema.index({ type: 1, reportedAt: -1 });
NotificationSchema.index({ user: 1, createdAt: -1 });

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
    const dbConnected = mongoose.connection.readyState === 1;
    res.json({
        status: 'online',
        db: dbConnected ? 'connected' : 'disconnected'
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
        const maskedNisn = req.body.nisn ? req.body.nisn.slice(0, -4) + '****' : '(none)';
        console.log('📥 QR Login request for NISN:', maskedNisn);

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

            console.log('✨ New email user registered:', email?.split('@')[0] + '@***');

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
            console.log('👋 Email login:', email?.split('@')[0] + '@***');

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
// Only cache page 1 (most commonly requested for dashboard)
app.get('/api/items', authMiddleware, (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    if (page === 1 && limit <= 20) {
        return cache(30)(req, res, next);
    }
    next();
}, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const items = await Item.find()
            .select('-messages -complaints -claimPhoto -claimNotes -coordinates')
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

// Get MY reports only (scoped to authenticated user)
app.get('/api/items/mine', authMiddleware, async (req, res) => {
    try {
        const items = await Item.find({ reporter: req.user._id })
            .populate('reporter', 'nama nisn jurusan')
            .populate('claimer', 'nama')
            .populate('complaints.user', 'nama nisn jurusan')
            .sort({ reportedAt: -1 });
        res.json(items);
    } catch (error) {
        console.error('Error fetching my items:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch your reports.' });
    }
});

// Get single item
app.get('/api/items/:id',
    authMiddleware,
    [
        param('id').isMongoId().withMessage('Invalid item ID'),
    ],
    handleValidationErrors,
    async (req, res) => {
    try {
        const item = await Item.findById(req.params.id)
            .populate('reporter', 'nama nisn jurusan')
            .populate('claimer', 'nama')
            .populate('complaints.user', 'nama nisn jurusan');
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
            invalidateCache('/api/items');
            invalidateCache('/api/stats');
            res.status(201).json({ success: true, item: newItem });
        } catch (error) {
            console.error('Error creating item:', error.message);
            res.status(500).json({ success: false, message: 'Failed to create report.' });
        }
    }
);

// ── RATING MODEL ──────────────────────────────
const RatingSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 500 },
    createdAt: { type: Date, default: Date.now }
});
const Rating = mongoose.model('Rating', RatingSchema);

// Claim an item
// Start claim (Change status to On Progress)
app.post('/api/items/:id/start-claim',
    authMiddleware,
    [
        param('id').isMongoId().withMessage('Invalid item ID'),
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            // Atomic claim to prevent race conditions (TOCTOU)
            const item = await Item.findOneAndUpdate(
                {
                    _id: req.params.id,
                    status: 'Available',
                    reporter: { $ne: req.user._id }
                },
                {
                    $set: {
                        status: 'On Progress',
                        claimer: req.user._id
                    }
                },
                { new: true }
            );
            if (!item) {
                const existing = await Item.findById(req.params.id).select('reporter status');
                if (!existing) return res.status(404).json({ success: false, message: 'Item not found' });
                if (existing.reporter.toString() === req.user._id.toString()) {
                    return res.status(400).json({ success: false, message: 'You cannot claim your own item' });
                }
                return res.status(400).json({ success: false, message: 'Item is already being claimed or returned' });
            }

            invalidateCache('/api/items');
            invalidateCache('/api/stats');

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
            console.error('Start claim error:', error.message);
            res.status(500).json({ success: false, message: 'Failed to start claim.' });
        }
    }
);

// Chat in item
app.post('/api/items/:id/chat',
    authMiddleware,
    [
        param('id').isMongoId().withMessage('Invalid item ID'),
    ],
    handleValidationErrors,
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
            console.error('Chat error:', error.message);
            res.status(500).json({ success: false, message: 'Failed to send message.' });
        }
    }
);

// File a complaint
app.post('/api/items/:id/complaint',
    authMiddleware,
    [
        param('id').isMongoId().withMessage('Invalid item ID'),
        body('reason').trim().notEmpty().withMessage('Reason is required')
            .isLength({ min: 3, max: 500 }).withMessage('Reason must be 3-500 characters'),
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { reason } = req.body;
            const item = await Item.findById(req.params.id);
            if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

            // Check if user already filed a complaint
            const alreadyComplained = item.complaints.some(c => c.user.toString() === req.user._id.toString());
            if (alreadyComplained) {
                return res.status(400).json({ success: false, message: 'You have already filed a complaint for this item' });
            }

            item.complaints.push({
                user: req.user._id,
                reason
            });
            await item.save();

            invalidateCache('/api/items');

            // Notify founder about the complaint
            await Notification.create({
                user: item.reporter,
                type: 'complaint',
                item: item._id,
                text: `Seseorang telah mengajukan komplain kepemilikan untuk barang "${item.name}".`
            });

            res.json({ success: true, message: 'Complaint filed' });
        } catch (error) {
            console.error('Complaint error:', error.message);
            res.status(500).json({ success: false, message: 'Failed to file complaint.' });
        }
    }
);

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

            invalidateCache('/api/items');
            invalidateCache('/api/stats');

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
app.get('/api/stats', authMiddleware, cache(60), async (req, res) => {
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

// ── RATING ROUTES ──────────────────────────

app.post('/api/ratings',
    authMiddleware,
    [
        body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
        body('comment').optional().trim().isLength({ max: 500 }).withMessage('Comment too long'),
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { rating, comment } = req.body;

            const existing = await Rating.findOne({ user: req.user._id });
            if (existing) {
                existing.rating = rating;
                if (comment !== undefined) existing.comment = comment;
                await existing.save();
                invalidateCache('/api/ratings');
                return res.json({ success: true, message: 'Rating updated', rating: existing });
            }
            const newRating = new Rating({ user: req.user._id, rating, comment });
            await newRating.save();
            res.json({ success: true, message: 'Rating submitted', rating: newRating });
        } catch (error) {
            console.error('Submit rating error:', error.message);
            res.status(500).json({ success: false, message: 'Failed to submit rating.' });
        }
    }
);

app.get('/api/ratings', authMiddleware, cache(300), async (req, res) => {
    try {
        const ratings = await Rating.find().populate('user', 'nama').sort({ createdAt: -1 });
        const totalRatings = ratings.length;
        const averageRating = totalRatings > 0
            ? (ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings)
            : 0;

        res.json({
            averageRating: Math.round(averageRating * 10) / 10,
            totalRatings,
            ratings: ratings.map(r => ({
                rating: r.rating,
                comment: r.comment,
                createdAt: r.createdAt
            }))
        });
    } catch (error) {
        console.error('Fetch ratings error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch ratings.' });
    }
});

app.get('/api/ratings/mine', authMiddleware, async (req, res) => {
    try {
        const rating = await Rating.findOne({ user: req.user._id });
        res.json({ rating: rating || null });
    } catch (error) {
        console.error('Fetch my rating error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch your rating.' });
    }
});

// ── DETAILED STATS ROUTE ─────────────────────

app.get('/api/stats/detailed', authMiddleware, heavyEndpointLimiter, cache(300), async (req, res) => {
    try {
        // Items per day (last 14 days)
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        const itemsSince = await Item.find({ reportedAt: { $gte: fourteenDaysAgo } }).sort({ reportedAt: 1 });

        const itemsPerDay = [];
        for (let i = 0; i < 14; i++) {
            const day = new Date(fourteenDaysAgo);
            day.setDate(day.getDate() + i);
            const dayStart = new Date(day.setHours(0, 0, 0, 0));
            const dayEnd = new Date(day.setHours(23, 59, 59, 999));

            const dayItems = itemsSince.filter(item =>
                item.reportedAt >= dayStart && item.reportedAt <= dayEnd
            );

            itemsPerDay.push({
                date: dayStart.toISOString().split('T')[0],
                lost: dayItems.filter(i => i.type === 'lost').length,
                found: dayItems.filter(i => i.type === 'found').length,
                returned: dayItems.filter(i => i.status === 'Returned').length
            });
        }

        // Top locations
        const allItems = await Item.find({});
        const locationCount = {};
        allItems.forEach(item => {
            const loc = item.location?.trim();
            if (loc) {
                locationCount[loc] = (locationCount[loc] || 0) + 1;
            }
        });
        const topLocations = Object.entries(locationCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([location, count]) => ({ location, count }));

        // Top categories
        const categoryCount = {};
        allItems.forEach(item => {
            const cat = item.category?.trim() || 'Others';
            categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        });
        const topCategories = Object.entries(categoryCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([category, count]) => ({ category, count }));

        // Fun facts
        const totalItems = allItems.length;
        const totalReturned = allItems.filter(i => i.status === 'Returned').length;
        const returnRate = totalItems > 0 ? Math.round((totalReturned / totalItems) * 100) : 0;

        // Most common location
        const mostCommonLocation = topLocations[0]?.location || 'N/A';

        // Most lost category
        const mostLostCategory = topCategories[0]?.category || 'N/A';

        // Busiest day of week
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayCount = [0, 0, 0, 0, 0, 0, 0];
        allItems.forEach(item => {
            const day = new Date(item.reportedAt).getDay();
            dayCount[day]++;
        });
        const busiestDayIndex = dayCount.indexOf(Math.max(...dayCount));
        const busiestDay = dayNames[busiestDayIndex];

        // Average time to return
        const returnedItems = allItems.filter(i => i.status === 'Returned' && i.claimedAt);
        let totalHours = 0;
        let avgHours = 0;
        if (returnedItems.length > 0) {
            totalHours = returnedItems.reduce((sum, item) => {
                const reported = new Date(item.reportedAt).getTime();
                const claimed = new Date(item.claimedAt).getTime();
                return sum + (claimed - reported);
            }, 0);
            avgHours = totalHours / returnedItems.length / (1000 * 60 * 60);
        }
        const avgDaysToReturn = avgHours > 0 ? Math.round((avgHours / 24) * 10) / 10 : 0;

        res.json({
            itemsPerDay,
            topLocations,
            topCategories,
            funFacts: {
                mostCommonLocation,
                mostLostCategory,
                busiestDay,
                totalItems,
                totalReturned,
                returnRate,
                avgDaysToReturn
            }
        });
    } catch (error) {
        console.error('Error fetching detailed stats:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch detailed stats.' });
    }
});

// Reassign claimer (Founder decides who claims — no permanent Returned marking)
app.post('/api/items/:id/resolve',
    authMiddleware,
    [
        param('id').isMongoId().withMessage('Invalid item ID'),
        body('userId').isMongoId().withMessage('Invalid user ID'),
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { userId } = req.body;
            const item = await Item.findById(req.params.id);
            if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

            if (item.reporter.toString() !== req.user._id.toString()) {
                return res.status(403).json({ success: false, message: 'Only founder can assign claimer' });
            }

            // Only reassign claimer — keep status as-is (final claim requires QR + photo)
            item.claimer = userId;
            await item.save();

            invalidateCache('/api/items');

            res.json({ success: true, message: 'Claimer reassigned successfully' });
        } catch (error) {
            console.error('Resolve error:', error.message);
            res.status(500).json({ success: false, message: 'Failed to reassign claimer.' });
        }
    }
);

// Notifications routes
app.get('/api/notifications', authMiddleware, async (req, res) => {
    try {
        const notifs = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(20);
        res.json(notifs);
    } catch (error) {
        console.error('Fetch notifications error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
    }
});

app.post('/api/notifications/:id/read', authMiddleware, async (req, res) => {
    try {
        await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { isRead: true });
        res.json({ success: true });
    } catch (error) {
        console.error('Mark as read error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to mark notification as read.' });
    }
});

// ── CATCH-ALL ────────────────────────────────
// Handle 404 for unknown API routes
app.use('/api', (req, res) => {
    res.status(404).json({ success: false, message: 'API route not found.' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('💥 Unhandled Error Stack:', err.stack || err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
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
    }
});

// Socket.IO authentication middleware
io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
        return next(new Error('Authentication required'));
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.userId = decoded.id;
        next();
    } catch (err) {
        next(new Error('Invalid or expired token'));
    }
});

// Per-socket rate limiting for messages
const socketRateLimit = new Map();
const SOCKET_RATE_LIMIT_WINDOW = 10000; // 10 seconds
const SOCKET_RATE_LIMIT_MAX = 20;

const checkSocketRateLimit = (socketId) => {
    const now = Date.now();
    const entry = socketRateLimit.get(socketId);
    if (!entry || now - entry.windowStart > SOCKET_RATE_LIMIT_WINDOW) {
        socketRateLimit.set(socketId, { windowStart: now, count: 1 });
        return true;
    }
    if (entry.count >= SOCKET_RATE_LIMIT_MAX) {
        return false;
    }
    entry.count++;
    return true;
};

io.on('connection', (socket) => {
    console.log('🔌 New socket connection:', socket.userId);

    socket.on('join-user', (userId) => {
        if (socket.userId === userId) {
            socket.join(`user-${userId}`);
        }
    });

    socket.on('join-item', async (itemId) => {
        try {
            if (!mongoose.isValidObjectId(itemId)) return;
            const item = await Item.findById(itemId).select('reporter claimer').lean();
            if (!item) return;
            const uid = socket.userId;
            const isReporter = item.reporter.toString() === uid;
            const isClaimer = item.claimer && item.claimer.toString() === uid;
            if (isReporter || isClaimer) {
                socket.join(`item-${itemId}`);
            }
        } catch (e) {
            // silently ignore invalid join
        }
    });

    socket.on('send-message', async (data) => {
        if (!checkSocketRateLimit(socket.id)) {
            socket.emit('rate-limited', { message: 'Too many messages. Please slow down.' });
            return;
        }
        // Forward to the chat HTTP handler can pick it up, or handle directly
        // For now, this is a safety valve — main chat goes through HTTP POST
        socket.broadcast.to(`item-${data.itemId}`).emit('new-message', data);
    });

    socket.on('disconnect', () => {
        socketRateLimit.delete(socket.id);
        console.log('🔌 Socket disconnected:', socket.userId);
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
                const notif = await Notification.create({
                    user: item.reporter,
                    type: 'system',
                    item: null,
                    text: `Pemberitahuan Sistem: Laporan "${item.name}" Anda telah dihapus otomatis sesuai kebijakan retensi (10 hari belum kembali / 2 hari setelah dikembalikan).`
                });

                try {
                    io.to(`user-${item.reporter}`).emit('notification', notif);
                } catch (emitErr) {
                    console.error('Failed to emit notification:', emitErr.message);
                }

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
