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

// 1. DNS FIX (For Atlas connection issues on restricted networks)
dns.setServers(['1.1.1.1', '8.8.8.8']);

const app = express();
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
app.use(helmet());

// CORS — restrict to frontend origin in production
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:4173',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc in dev)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

// Body parser with size limit (prevents oversized payloads)
app.use(express.json({ limit: '5mb' }));

// Global rate limiter
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // max 200 requests per window
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
    nisn: { type: String, unique: true, sparse: true, trim: true, maxlength: 20 },
    nis: { type: String, trim: true, maxlength: 20 },
    jurusan: { type: String, trim: true, maxlength: 100 },
    ttl: { type: String, trim: true, maxlength: 100 },
    agama: { type: String, trim: true, maxlength: 50 },
    gender: { type: String, trim: true, maxlength: 20 },
    email: { type: String, unique: true, sparse: true, trim: true, lowercase: true, maxlength: 100 },
    password: { type: String, select: false }, // hidden by default in queries
    role: { type: String, default: 'student', enum: ['student', 'admin'] },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

const ItemSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 200 },
    location: { type: String, required: true, trim: true, maxlength: 200 },
    category: { type: String, trim: true, maxlength: 50, default: 'Others' },
    status: { type: String, default: 'Available', enum: ['Available', 'Returned'] },
    type: { type: String, required: true, enum: ['Found', 'lost'] },
    reportedAt: { type: Date, default: Date.now },
    imageUrl: { type: String, maxlength: 3000000 }, // base64 images can be large
    description: { type: String, trim: true, maxlength: 500 },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

const Item = mongoose.model('Item', ItemSchema);

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
        const items = await Item.find()
            .populate('reporter', 'nama nisn jurusan')
            .sort({ reportedAt: -1 })
            .limit(50);
        res.json(items);
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
            .sort({ reportedAt: -1 });
        res.json(items);
    } catch (error) {
        console.error('Error fetching my items:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch your reports.' });
    }
});

// Create new item (reporter is always the authenticated user)
app.post('/api/items',
    authMiddleware,
    [
        body('name').trim().notEmpty().withMessage('Item name is required')
            .isLength({ max: 200 }).withMessage('Item name too long'),
        body('location').trim().notEmpty().withMessage('Location is required')
            .isLength({ max: 200 }).withMessage('Location too long'),
        body('category').optional().trim().isLength({ max: 50 }),
        body('type').trim().notEmpty().isIn(['Found', 'lost']).withMessage('Type must be Found or lost'),
        body('description').optional().trim().isLength({ max: 500 }).withMessage('Description too long'),
        body('imageUrl').optional().isLength({ max: 3000000 }).withMessage('Image too large'),
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { name, location, category, type, description, imageUrl } = req.body;

            const newItem = new Item({
                name,
                location,
                category: category || 'Others',
                type,
                description,
                imageUrl,
                reporter: req.user._id // Always use authenticated user's ID
            });

            await newItem.save();
            res.status(201).json({ success: true, item: newItem });
        } catch (error) {
            console.error('Error creating item:', error.message);
            res.status(500).json({ success: false, message: 'Failed to create report.' });
        }
    }
);

// Claim an item
app.post('/api/items/:id/claim',
    authMiddleware,
    [
        param('id').isMongoId().withMessage('Invalid item ID'),
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const item = await Item.findById(req.params.id);
            if (!item) {
                return res.status(404).json({ success: false, message: 'Item not found' });
            }

            if (item.status === 'Returned') {
                return res.status(400).json({ success: false, message: 'Item already claimed' });
            }

            item.status = 'Returned';
            await item.save();

            res.json({ success: true, message: 'Item claimed successfully!' });
        } catch (error) {
            console.error('Error claiming item:', error.message);
            res.status(500).json({ success: false, message: 'Failed to claim item.' });
        }
    }
);

// Stats (protected)
app.get('/api/stats', authMiddleware, async (req, res) => {
    try {
        const currentlyLost = await Item.countDocuments({
            type: { $regex: /^lost$/i },
            status: 'Available'
        });
        const foundToday = await Item.countDocuments({
            type: { $regex: /^found$/i },
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
    console.error('💥 Unhandled Error:', err.message);
    res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ─────────────────────────────────────────────
// 8. START SERVER
// ─────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
});
