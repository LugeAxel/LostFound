const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, param, validationResult } = require('express-validator');
require('dotenv').config({ path: '../.env' });
const cron = require('node-cron');
const cloudinary = require('./config/cloudinary');
const { cache, invalidateCache } = require('./middleware/cache');

const http = require('http');
const { Server } = require('socket.io');
const { supabase } = require('./lib/supabase');
const crypto = require('crypto');

function extractCloudinaryPublicId(url) {
    if (!url || !url.includes('cloudinary')) return null;
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)\.\w+$/);
    return match ? match[1] : null;
}

const app = express();
app.set('trust proxy', 1);
const upload = require('./middleware/upload');
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ FATAL: SUPABASE_URL or SUPABASE_ANON_KEY is not set in .env');
    process.exit(1);
}

// ─────────────────────────────────────────────
// 2. SECURITY MIDDLEWARE
// ─────────────────────────────────────────────

app.use(helmet({
    crossOriginResourcePolicy: false
}));

const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = [
    ...(isProduction ? [] : [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:4173',
        process.env.FRONTEND_URL,
    ]),
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
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

app.use(express.json({ limit: '5mb' }));

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    skip: (req) => req.originalUrl.startsWith('/socket.io'),
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use(globalLimiter);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many login attempts, please try again later.' }
});

const heavyEndpointLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests to this endpoint.' }
});

// ─────────────────────────────────────────────
// 3. AUTH MIDDLEWARE (Supabase Auth)
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
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token.'
            });
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return res.status(401).json({
                success: false,
                message: 'User profile not found.'
            });
        }

        req.user = profile;
        req.supabaseUser = user;
        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Authentication error.'
        });
    }
};

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

// Haversine distance in meters
function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.asin(Math.sqrt(a));
}

// Extract meaningful keywords from item name and description
function extractKeywords(name, description) {
    const text = `${name || ''} ${description || ''}`.toLowerCase();
    const stopWords = new Set([
        'dan', 'di', 'ke', 'dari', 'yang', 'ini', 'itu', 'saya', 'aku',
        'the', 'a', 'an', 'in', 'of', 'to', 'is', 'for', 'on', 'and',
        'or', 'with', 'yang', 'ada', 'tidak', 'bisa', 'barang', 'warna',
    ]);
    const words = text.split(/\s+/).filter(w => w.length >= 3 && !stopWords.has(w));
    return [...new Set(words)];
}

// Compute text relevance score between lost item and found item
function computeTextRelevance(lostItem, foundItem) {
    const lostName = (lostItem.name || '').toLowerCase();
    const lostDesc = (lostItem.description || '').toLowerCase();
    const foundName = (foundItem.name || '').toLowerCase();
    const foundDesc = (foundItem.description || '').toLowerCase();
    const foundText = `${foundName} ${foundDesc}`;

    let score = 0;

    // Full phrase match: lost item name appears in found text
    if (foundText.includes(lostName)) score += 30;
    if (lostDesc && foundText.includes(lostDesc)) score += 15;

    // Keyword-level matching
    const keywords = extractKeywords(lostItem.name, lostItem.description);
    for (const kw of keywords) {
        if (foundName.includes(kw)) score += 15;
        else if (foundDesc.includes(kw)) score += 5;
    }

    return score;
}

// Score how well a candidate matches a source item (category + area + text + GPS)
function computeScore(sourceItem, candidateItem) {
    let score = 0;

    // Category match (high weight)
    if (candidateItem.category === sourceItem.category) score += 30;

    // Area category match
    if (sourceItem.area_category && candidateItem.area_category === sourceItem.area_category) score += 20;

    // Text relevance (name + description keywords)
    score += computeTextRelevance(sourceItem, candidateItem);

    // GPS proximity bonus
    const lat = sourceItem.coordinates_lat;
    const lng = sourceItem.coordinates_lng;
    if (lat != null && lng != null && candidateItem.coordinates_lat != null && candidateItem.coordinates_lng != null) {
        const dist = haversineDistance(lat, lng, candidateItem.coordinates_lat, candidateItem.coordinates_lng);
        if (dist < 100) score += 25;
        else if (dist < 500) score += 15;
        else if (dist < 1000) score += 5;
    }

    return score;
}

// 3-pass matching: find top-N items of targetType that match sourceItem
async function findMatchingItems(sourceItem, targetType, limit = 5) {
    const keywords = extractKeywords(sourceItem.name, sourceItem.description);
    const candidates = [];
    const seen = new Set();

    // Pass 1: same category + same area_category (highest confidence)
    let q1 = supabase
        .from('items')
        .select('*, reporter:profiles!items_reporter_fkey(id, nama, nisn)')
        .eq('type', targetType)
        .in('status', ['Available', 'On Progress', 'Returned'])
        .eq('category', sourceItem.category)
        .neq('id', sourceItem.id);
    if (sourceItem.area_category) q1 = q1.eq('area_category', sourceItem.area_category);
    const { data: p1 } = await q1.limit(50);
    if (p1) for (const fi of p1) { seen.add(fi.id); candidates.push(fi); }

    // Pass 2: same category only (broader)
    if (sourceItem.area_category) {
        let q2 = supabase
            .from('items')
            .select('*, reporter:profiles!items_reporter_fkey(id, nama, nisn)')
            .eq('type', targetType)
            .in('status', ['Available', 'On Progress', 'Returned'])
            .eq('category', sourceItem.category)
            .neq('id', sourceItem.id);
        const { data: p2 } = await q2.limit(30);
        if (p2) for (const fi of p2) { if (!seen.has(fi.id)) { seen.add(fi.id); candidates.push(fi); } }
    }

    // Pass 3: text keyword match across all categories
    if (keywords.length > 0) {
        const orClauses = keywords.flatMap(kw => [
            `name.ilike.%25${kw}%25`,
            `description.ilike.%25${kw}%25`
        ]).join(',');
        let q3 = supabase
            .from('items')
            .select('*, reporter:profiles!items_reporter_fkey(id, nama, nisn)')
            .eq('type', targetType)
            .in('status', ['Available', 'On Progress', 'Returned'])
            .neq('category', sourceItem.category)
            .neq('id', sourceItem.id)
            .or(orClauses);
        const { data: p3 } = await q3.limit(20);
        if (p3) for (const fi of p3) { if (!seen.has(fi.id)) { seen.add(fi.id); candidates.push(fi); } }
    }

    // Score & sort
    const scored = candidates.map(fi => {
        const score = computeScore(sourceItem, fi);
        let distance = null;
        if (sourceItem.coordinates_lat != null && sourceItem.coordinates_lng != null && fi.coordinates_lat != null && fi.coordinates_lng != null) {
            distance = Math.round(haversineDistance(sourceItem.coordinates_lat, sourceItem.coordinates_lng, fi.coordinates_lat, fi.coordinates_lng));
        }
        return { ...fi, score, distance_meters: distance };
    });

    scored.sort((a, b) => b.score - a.score || (a.distance_meters || Infinity) - (b.distance_meters || Infinity));

    return scored.slice(0, limit);
}

// ─────────────────────────────────────────────
// 4. ROUTES
// ─────────────────────────────────────────────

// Health check (public)
app.get('/api/health', async (req, res) => {
    try {
        const { error } = await supabase.from('profiles').select('id').limit(1);
        res.json({
            status: 'online',
            db: error ? 'disconnected' : 'connected'
        });
    } catch {
        res.json({ status: 'online', db: 'disconnected' });
    }
});

// ── AUTH ROUTES ──────────────────────────────

// QR Code login (NISN-based auto-registration via Supabase Auth)
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
            const { nisn, nama, nis, jurusan, ttl, agama, gender } = req.body;

            let { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('nisn', nisn)
                .single();

            if (!profile) {
                console.log('✨ New student detected, creating profile...');
                const email = `nisn_${nisn}@qreturn.local`;
                const password = `qr_${nisn}_${Date.now()}`;

                const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                    email,
                    password,
                    email_confirm: true,
                    user_metadata: { nama, nisn, nis, jurusan, ttl, agama, gender, qr_password: password }
                });

                if (authError) {
                    console.error('Auth creation error:', authError.message);
                    return res.status(500).json({ success: false, message: 'Failed to create user.' });
                }

                profile = authData.user;
                profile.qr_password = password;
            } else {
                console.log('👋 Welcome back,', profile.nama);
                const { data: authUser } = await supabase.auth.admin.getUserById(profile.id);
                profile.qr_password = authUser?.user?.user_metadata?.qr_password || `qr_${nisn}_${new Date(profile.created_at).getTime()}`;
            }

            const email = `nisn_${nisn}@qreturn.local`;
            const password = profile.qr_password;

            const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (sessionError) {
                console.error('Session error, resetting password:', sessionError.message);
                const newPassword = `qr_${nisn}_${Date.now()}`;
                await supabase.auth.admin.updateUserById(profile.id, {
                    password: newPassword,
                    user_metadata: { qr_password: newPassword }
                });

                const { data: newSession, error: newSessionError } = await supabase.auth.signInWithPassword({
                    email,
                    password: newPassword
                });

                if (newSessionError) {
                    console.error('Failed to login after password reset:', newSessionError.message);
                    return res.status(500).json({ success: false, message: 'Failed to authenticate user.' });
                }

                res.json({
                    success: true,
                    token: newSession.session.access_token,
                    refresh_token: newSession.session.refresh_token,
                    user: {
                        id: profile.id,
                        nama: profile.nama,
                        nisn: profile.nisn,
                        nis: profile.nis,
                        jurusan: profile.jurusan,
                        role: profile.role,
                        email: profile.email || null
                    }
                });
                return;
            }

            res.json({
                success: true,
                token: sessionData.session.access_token,
                refresh_token: sessionData.session.refresh_token,
                user: {
                    id: profile.id,
                    nama: profile.nama,
                    nisn: profile.nisn,
                    nis: profile.nis,
                    jurusan: profile.jurusan,
                    role: profile.role,
                    email: profile.email || null
                }
            });
        } catch (error) {
            console.error('🔥 QR Login Error:', error.message);
            res.status(500).json({ success: false, message: 'Server error during login.' });
        }
    }
);

// Email registration
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
            const { email, password, nama } = req.body;

            const { data: existingUsers } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', email)
                .limit(1);

            if (existingUsers && existingUsers.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'An account with this email already exists. Please login instead.'
                });
            }

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { nama }
                }
            });

            if (authError) {
                console.error('🔥 Email Register Error:', authError.message);
                return res.status(500).json({ success: false, message: 'Server error during registration.' });
            }

            const token = authData.session?.access_token;

            console.log('✨ New email user registered:', email?.split('@')[0] + '@***');

            res.status(201).json({
                success: true,
                token,
                user: {
                    id: authData.user?.id,
                    nama: authData.user?.user_metadata?.nama || nama,
                    nisn: authData.user?.user_metadata?.nisn || null,
                    nis: authData.user?.user_metadata?.nis || null,
                    jurusan: authData.user?.user_metadata?.jurusan || null,
                    role: authData.user?.user_metadata?.role || 'student',
                    email: authData.user?.email
                }
            });
        } catch (error) {
            console.error('🔥 Email Register Error:', error.message);
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
            const { email, password } = req.body;

            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (authError) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password.'
                });
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authData.user.id)
                .single();

            console.log('👋 Email login:', email?.split('@')[0] + '@***');

            res.json({
                success: true,
                token: authData.session.access_token,
                user: {
                    id: profile?.id,
                    nama: profile?.nama,
                    nisn: profile?.nisn || null,
                    nis: profile?.nis || null,
                    jurusan: profile?.jurusan || null,
                    role: profile?.role,
                    email: profile?.email
                }
            });
        } catch (error) {
            console.error('🔥 Email Login Error:', error.message);
            res.status(500).json({ success: false, message: 'Server error during login.' });
        }
    }
);

// Verify token + get current user
app.get('/api/auth/me', authMiddleware, async (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user.id,
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

// Get all items
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
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabase
            .from('items')
            .select(`
                *,
                reporter:profiles!items_reporter_fkey(id, nama, nisn, jurusan),
                claimer:profiles!items_claimer_fkey(id, nama)
            `)
            .order('reported_at', { ascending: false })
            .range(from, to);

        if (req.query.category && req.query.category !== 'all') {
            query = query.eq('category', req.query.category);
        }

        if (req.query.area_category && req.query.area_category !== 'all') {
            query = query.eq('area_category', req.query.area_category);
        }

        if (req.query.type && req.query.type !== 'all') {
            query = query.eq('type', req.query.type);
        }

        const { data: items, error, count } = await query;

        if (error) throw error;

        res.json({
            items,
            currentPage: page,
            totalPages: Math.ceil((count || 0) / limit),
            totalItems: count
        });
    } catch (error) {
        console.error('Error fetching items:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch items.' });
    }
});

// Get MY reports
app.get('/api/items/mine', authMiddleware, async (req, res) => {
    try {
        const { data: items, error } = await supabase
            .from('items')
            .select(`
                *,
                reporter:profiles!items_reporter_fkey(id, nama, nisn, jurusan),
                claimer:profiles!items_claimer_fkey(id, nama),
                complaints(*)
            `)
            .eq('reporter', req.user.id)
            .order('reported_at', { ascending: false });

        if (error) throw error;

        res.json(items);
    } catch (error) {
        console.error('Error fetching my items:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch your reports.' });
    }
});

// Get item by claim code (used by Claim.vue after QR scan)
app.get('/api/items/claim-code/:code', authMiddleware, async (req, res) => {
    try {
        const { data: item, error } = await supabase
            .from('items')
            .select(`
                *,
                reporter:profiles!items_reporter_fkey(id, nama, nisn, jurusan),
                claimer:profiles!items_claimer_fkey(id, nama),
                complaints(*, user:profiles!complaints_user_id_fkey(nama, id))
            `)
            .eq('claim_code', req.params.code)
            .single();

        if (error || !item) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        // If item is On Progress and has an assigned claimer, only that claimer can access
        if (item.status === 'On Progress' && item.claimer && item.claimer.id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'This claim link belongs to another user.' });
        }

        res.json(item);
    } catch (error) {
        console.error('Error fetching item by claim code:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch item.' });
    }
});

// Get matched found items for a lost item (3-pass text + category + GPS scoring)
app.get('/api/items/matches/:id', authMiddleware, async (req, res) => {
    try {
        const { data: lostItem, error: lostError } = await supabase
            .from('items')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (lostError || !lostItem) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        if (lostItem.type !== 'lost') {
            return res.json([]);
        }

        const matches = await findMatchingItems(lostItem, 'found', 5);
        res.json(matches);
    } catch (error) {
        console.error('Error fetching matches:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch matches.' });
    }
});

// Dashboard recommendations: find matches for ALL of the current user's items
app.get('/api/items/recommendations', authMiddleware, async (req, res) => {
    try {
        const { data: myItems, error: myError } = await supabase
            .from('items')
            .select('*')
            .eq('reporter', req.user.id);

        if (myError) throw myError;
        if (!myItems || myItems.length === 0) return res.json([]);

        const seen = new Set();
        const allMatches = [];

        for (const item of myItems) {
            const targetType = item.type === 'lost' ? 'found' : 'lost';
            const matches = await findMatchingItems(item, targetType, 3);
            for (const m of matches) {
                if (!seen.has(m.id)) {
                    seen.add(m.id);
                    allMatches.push(m);
                }
            }
        }

        allMatches.sort((a, b) => b.score - a.score || (a.distance_meters || Infinity) - (b.distance_meters || Infinity));

        res.json(allMatches.slice(0, 24));
    } catch (error) {
        console.error('Error fetching recommendations:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch recommendations.' });
    }
});

// Get single item
app.get('/api/items/:id', authMiddleware, async (req, res) => {
    try {
        const { data: item, error } = await supabase
            .from('items')
            .select(`
                *,
                reporter:profiles!items_reporter_fkey(id, nama, nisn, jurusan),
                claimer:profiles!items_claimer_fkey(id, nama),
                complaints(*, user:profiles!complaints_user_id_fkey(nama, id))
            `)
            .eq('id', req.params.id)
            .single();

        if (error || !item) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        res.json(item);
    } catch (error) {
        console.error('Error fetching item:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch item.' });
    }
});

// Create new item
app.post('/api/items',
    authMiddleware,
    upload.single('image'),
    [
        body('name').trim().notEmpty().withMessage('Item name is required')
            .isLength({ max: 200 }).withMessage('Item name too long'),
        body('location').trim().notEmpty().withMessage('Location is required')
            .isLength({ max: 200 }).withMessage('Location too long'),
        body('category').optional().trim().isLength({ max: 50 }),
        body('area_category').optional().trim().isLength({ max: 50 }),
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
            const { name, location, category, area_category, type, description } = req.body;
            let coordinates;
            if (req.body.coordinates) {
                try {
                    coordinates = typeof req.body.coordinates === 'string' ? JSON.parse(req.body.coordinates) : req.body.coordinates;
                } catch (e) {
                    console.error('Failed to parse coordinates');
                }
            }

            const imageUrl = req.file ? req.file.path : null;

            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            const bytes = crypto.randomBytes(8);
            let claimCode = '';
            for (let i = 0; i < 8; i++) {
                claimCode += chars[bytes[i] % chars.length];
            }

            const newItemData = {
                name,
                location,
                category: category || 'Others',
                area_category: area_category || null,
                type: type.toLowerCase(),
                description,
                image_url: imageUrl,
                reporter: req.user.id,
                claim_code: claimCode,
            };

            if (coordinates && typeof coordinates.latitude === 'number' && typeof coordinates.longitude === 'number') {
                newItemData.coordinates_lat = coordinates.latitude;
                newItemData.coordinates_lng = coordinates.longitude;
            }

            const { data: newItem, error } = await supabase
                .from('items')
                .insert(newItemData)
                .select()
                .single();

            if (error) throw error;

            invalidateCache('/api/items');
            invalidateCache('/api/stats');

            // If lost item, find matching found items (3-pass) and create suggestion notification
            if (newItem.type === 'lost') {
                try {
                    const keywords = extractKeywords(newItem.name, newItem.description);
                    const candidates = [];
                    const seen = new Set();

                    // Pass 1: same category + same area_category
                    let q1 = supabase.from('items').select('*')
                        .eq('type', 'found').in('status', ['Available', 'On Progress', 'Returned'])
                        .eq('category', newItem.category).neq('id', newItem.id);
                    if (newItem.area_category) q1 = q1.eq('area_category', newItem.area_category);
                    const { data: p1 } = await q1.limit(50);
                    if (p1) for (const fi of p1) { seen.add(fi.id); candidates.push(fi); }

                    // Pass 2: same category only
                    if (newItem.area_category) {
                        let q2 = supabase.from('items').select('*')
                            .eq('type', 'found').in('status', ['Available', 'On Progress', 'Returned'])
                            .eq('category', newItem.category).neq('id', newItem.id);
                        const { data: p2 } = await q2.limit(30);
                        if (p2) for (const fi of p2) { if (!seen.has(fi.id)) { seen.add(fi.id); candidates.push(fi); } }
                    }

                    // Pass 3: text keyword match across all categories
                    if (keywords.length > 0) {
                        const orClauses = keywords.flatMap(kw => [
                            `name.ilike.%25${kw}%25`,
                            `description.ilike.%25${kw}%25`
                        ]).join(',');
                        let q3 = supabase.from('items').select('*')
                            .eq('type', 'found').in('status', ['Available', 'On Progress', 'Returned'])
                            .neq('category', newItem.category).neq('id', newItem.id)
                            .or(orClauses);
                        const { data: p3 } = await q3.limit(20);
                        if (p3) for (const fi of p3) { if (!seen.has(fi.id)) { seen.add(fi.id); candidates.push(fi); } }
                    }

                    if (candidates.length > 0) {
                        let bestMatch = null;
                        let bestScore = -Infinity;

                        for (const fi of candidates) {
                            const score = computeScore(newItem, fi);
                            if (score > bestScore) {
                                bestScore = score;
                                bestMatch = fi;
                            }
                        }

                        if (bestMatch && bestScore >= 30) {
                            await supabase
                                .from('notifications')
                                .insert({
                                    user_id: newItem.reporter,
                                    type: 'suggestion',
                                    item_id: bestMatch.id,
                                    text: `This might be your item: ${bestMatch.name}`
                                });
                        }
                    }
                } catch (matchError) {
                    console.error('Error finding matches:', matchError.message);
                }
            }

            res.status(201).json({ success: true, item: newItem });
        } catch (error) {
            console.error('Error creating item:', error.message);
            res.status(500).json({ success: false, message: 'Failed to create report.' });
        }
    }
);

// Edit item (reporter only)
app.put('/api/items/:id',
    authMiddleware,
    upload.single('image'),
    [
        param('id').isUUID().withMessage('Invalid item ID'),
        body('name').optional().trim().notEmpty().withMessage('Item name is required')
            .isLength({ max: 200 }).withMessage('Item name too long'),
        body('location').optional().trim().notEmpty().withMessage('Location is required')
            .isLength({ max: 200 }).withMessage('Location too long'),
        body('category').optional().trim().isLength({ max: 50 }),
        body('area_category').optional({ values: 'falsy' }).trim().isLength({ max: 50 }),
        body('type').optional().trim().isIn(['found', 'lost']).withMessage('Type must be found or lost'),
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
            const { data: item, error: itemError } = await supabase
                .from('items')
                .select('*')
                .eq('id', req.params.id)
                .single();

            if (itemError || !item) {
                return res.status(404).json({ success: false, message: 'Item not found' });
            }

            if (item.reporter !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Only the reporter can edit this item' });
            }

            if (item.status === 'Returned') {
                return res.status(400).json({ success: false, message: 'Cannot edit a returned item' });
            }

            const updateData = {};
            const editableFields = ['name', 'location', 'category', 'area_category', 'type', 'description'];

            for (const field of editableFields) {
                if (req.body[field] !== undefined) {
                    updateData[field] = req.body[field];
                }
            }

            if (req.file) {
                updateData.image_url = req.file.path;
            } else if (req.body.imageUrl) {
                updateData.image_url = req.body.imageUrl;
            }

            // Delete old Cloudinary image if a new image is being set
            if (updateData.image_url && item.image_url?.includes('cloudinary')) {
                try {
                    const publicId = extractCloudinaryPublicId(item.image_url);
                    if (publicId) await cloudinary.uploader.destroy(publicId);
                } catch (e) {
                    console.error('Failed to delete old Cloudinary image:', e.message);
                }
            }

            if (req.body.coordinates) {
                try {
                    const coords = typeof req.body.coordinates === 'string' ? JSON.parse(req.body.coordinates) : req.body.coordinates;
                    if (coords && typeof coords.latitude === 'number' && typeof coords.longitude === 'number') {
                        updateData.coordinates_lat = coords.latitude;
                        updateData.coordinates_lng = coords.longitude;
                    }
                } catch (e) {
                    // invalid coordinates — skip
                }
            }

            if (req.body.remove_claimer === true || req.body.remove_claimer === 'true') {
                if (item.status !== 'On Progress') {
                    return res.status(400).json({ success: false, message: 'Can only remove claimer from items with On Progress status' });
                }
                updateData.claimer = null;
                updateData.status = 'Available';
                updateData.claim_photo = null;
                updateData.claim_notes = null;
                updateData.claimed_at = null;
            }

            if (Object.keys(updateData).length === 0) {
                return res.status(400).json({ success: false, message: 'No fields to update' });
            }

            const { data: updated, error: updateError } = await supabase
                .from('items')
                .update(updateData)
                .eq('id', req.params.id)
                .select();

            if (updateError) throw updateError;

            invalidateCache('/api/items');
            invalidateCache('/api/stats');

            res.json({ success: true, item: updated[0] });
        } catch (error) {
            console.error('Edit item error:', error.message);
            res.status(500).json({ success: false, message: 'Failed to edit item.' });
        }
    }
);

// Start claim
app.post('/api/items/:id/start-claim',
    authMiddleware,
    [
        param('id').isUUID().withMessage('Invalid item ID'),
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            console.log('[claim] userId:', req.user.id, 'itemId:', req.params.id);

            const { data: updated, error } = await supabase
                .from('items')
                .update({
                    status: 'On Progress',
                    claimer: req.user.id
                })
                .eq('id', req.params.id)
                .eq('status', 'Available')
                .neq('reporter', req.user.id)
                .select();

            if (error) throw error;

            if (!updated || updated.length === 0) {
                const { data: existing } = await supabase
                    .from('items')
                    .select('reporter, status, claimer')
                    .eq('id', req.params.id)
                    .single();

                if (!existing) return res.status(404).json({ success: false, message: 'Item not found' });
                if (existing.reporter === req.user.id) {
                    return res.status(400).json({ success: false, message: 'You cannot claim your own item' });
                }
                if (existing.claimer === req.user.id) {
                    return res.status(400).json({ success: false, message: 'You have already claimed this item' });
                }
                return res.status(400).json({ success: false, message: 'Item is already being claimed or returned' });
            }

            const item = updated[0];

            invalidateCache('/api/items');
            invalidateCache('/api/stats');

            const { error: notifError } = await supabase
                .from('notifications')
                .insert({
                    user_id: item.reporter,
                    type: 'claim',
                    item_id: item.id,
                    text: `Someone wants to claim your item: ${item.name}`
                });

            if (notifError) console.error('Notification error:', notifError.message);

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
        param('id').isUUID().withMessage('Invalid item ID'),
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

            const { data: item, error: itemError } = await supabase
                .from('items')
                .select('*')
                .eq('id', req.params.id)
                .single();

            if (itemError || !item) return res.status(404).json({ success: false, message: 'Item not found' });

            const isReporter = item.reporter === req.user.id;
            const isClaimer = item.claimer === req.user.id;

            if (!isReporter && !isClaimer) {
                return res.status(403).json({ success: false, message: 'Only founder and claimer can chat' });
            }

            const { data: message, error: msgError } = await supabase
                .from('messages')
                .insert({
                    item_id: req.params.id,
                    sender: req.user.id,
                    text
                })
                .select()
                .single();

            if (msgError) throw msgError;

            const recipientId = isReporter ? item.claimer : item.reporter;
            if (recipientId) {
                await supabase
                    .from('notifications')
                    .insert({
                        user_id: recipientId,
                        type: 'message',
                        item_id: item.id,
                        text: `New message from ${isReporter ? 'Founder' : 'Claimer'} for item: ${item.name}`
                    });
            }

            io.to(`item-${item.id}`).emit('new-message', {
                itemId: item.id,
                message
            });

            res.json({ success: true, messages: [message] });
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
        param('id').isUUID().withMessage('Invalid item ID'),
        body('reason').trim().notEmpty().withMessage('Reason is required')
            .isLength({ min: 3, max: 500 }).withMessage('Reason must be 3-500 characters'),
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { reason } = req.body;

            const { data: inserted, error: complaintError } = await supabase
                .from('complaints')
                .insert({
                    item_id: req.params.id,
                    user_id: req.user.id,
                    reason
                })
                .select('id');

            if (complaintError) {
                if (complaintError.code === '23505' || !inserted?.length) {
                    return res.status(400).json({ success: false, message: 'You have already filed a complaint for this item' });
                }
                throw complaintError;
            }

            invalidateCache('/api/items');

            const { data: item } = await supabase
                .from('items')
                .select('name, reporter')
                .eq('id', req.params.id)
                .single();

            if (item) {
                await supabase
                    .from('notifications')
                    .insert({
                        user_id: item.reporter,
                        type: 'complaint',
                        item_id: item.id,
                        text: `Seseorang telah mengajukan komplain kepemilikan untuk barang "${item.name}".`
                    });
            }

            res.json({ success: true, message: 'Complaint filed' });
        } catch (error) {
            console.error('Complaint error:', error.message);
            res.status(500).json({ success: false, message: 'Failed to file complaint.' });
        }
    }
);

// Claim item (final)
app.post('/api/items/:id/claim',
    authMiddleware,
    [
        param('id').isUUID().withMessage('Invalid item ID'),
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { claim_photo, claim_notes } = req.body;
            const itemId = req.params.id;

            const { data: item, error: itemError } = await supabase
                .from('items')
                .select('*')
                .eq('id', itemId)
                .single();

            if (itemError || !item) {
                return res.status(404).json({ success: false, message: 'Item not found' });
            }

            if (item.status !== 'Available' && item.status !== 'On Progress') {
                return res.status(400).json({ success: false, message: 'Item is not available for claim' });
            }

            if (item.reporter === req.user.id) {
                return res.status(400).json({ success: false, message: 'You cannot claim your own item' });
            }

            // If item is On Progress and has an assigned claimer, only that claimer can claim
            if (item.status === 'On Progress' && item.claimer && item.claimer !== req.user.id) {
                return res.status(403).json({ success: false, message: 'This item is being claimed by another user.' });
            }

            const { data: updated, error: updateError } = await supabase
                .from('items')
                .update({
                    status: 'Returned',
                    claimer: req.user.id,
                    claim_photo,
                    claim_notes,
                    claimed_at: new Date().toISOString()
                })
                .eq('id', itemId)
                .neq('reporter', req.user.id)
                .select();

            if (updateError) throw updateError;

            if (!updated || updated.length === 0) {
                return res.status(400).json({ success: false, message: 'Item could not be claimed. It may have been updated by someone else.' });
            }

            const wibNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
            const y = wibNow.getUTCFullYear();
            const m = String(wibNow.getUTCMonth() + 1).padStart(2, '0');
            const d = String(wibNow.getUTCDate()).padStart(2, '0');
            const today = `${y}-${m}-${d}`;
            await supabase
                .from('counters')
                .upsert({ name: 'returnedAllTime', value: 0 }, { onConflict: 'name' })
                .then(async () => {
                    await supabase.rpc('increment_counter', { counter_name: 'returnedAllTime' });
                });

            await supabase
                .from('daily_counters')
                .upsert({ date: today, returned: 0 }, { onConflict: 'date' })
                .then(async () => {
                    await supabase.rpc('increment_daily_counter', { counter_date: today });
                });

            await supabase
                .from('notifications')
                .insert({
                    user_id: item.reporter,
                    type: 'resolved',
                    item_id: itemId,
                    text: `Barang "${item.name}" telah diklaim dan dikembalikan.`
                });

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

// Stats
app.get('/api/stats', authMiddleware, cache(60), async (req, res) => {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { count: currentlyLost } = await supabase
            .from('items')
            .select('*', { count: 'exact', head: true })
            .eq('type', 'lost')
            .eq('status', 'Available');

        const { count: foundToday } = await supabase
            .from('items')
            .select('*', { count: 'exact', head: true })
            .eq('type', 'found')
            .gte('reported_at', todayStart.toISOString());

        const { data: counter } = await supabase
            .from('counters')
            .select('value')
            .eq('name', 'returnedAllTime')
            .single();

        res.json({
            currentlyLost: currentlyLost || 0,
            foundToday: foundToday || 0,
            returnedAllTime: counter?.value || 0
        });
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

            const { data: existing } = await supabase
                .from('ratings')
                .select('*')
                .eq('user_id', req.user.id)
                .single();

            if (existing) {
                const { data: updated, error } = await supabase
                    .from('ratings')
                    .update({ rating, comment: comment !== undefined ? comment : existing.comment })
                    .eq('user_id', req.user.id)
                    .select()
                    .single();

                if (error) throw error;

                invalidateCache('/api/ratings');
                return res.json({ success: true, message: 'Rating updated', rating: updated });
            }

            const { data: newRating, error } = await supabase
                .from('ratings')
                .insert({ user_id: req.user.id, rating, comment })
                .select()
                .single();

            if (error) throw error;

            invalidateCache('/api/ratings');
            res.json({ success: true, message: 'Rating submitted', rating: newRating });
        } catch (error) {
            console.error('Submit rating error:', error.message);
            res.status(500).json({ success: false, message: 'Failed to submit rating.' });
        }
    }
);

app.get('/api/ratings', authMiddleware, cache(300), async (req, res) => {
    try {
        const { data: ratings, error } = await supabase
            .from('ratings')
            .select('*, user:profiles!ratings_user_id_fkey(nama)')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const totalRatings = ratings.length;
        const averageRating = totalRatings > 0
            ? (ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings)
            : 0;

        const ratingsWithUsers = (ratings || []).map(r => r);

        res.json({
            averageRating: Math.round(averageRating * 10) / 10,
            totalRatings,
            ratings: ratingsWithUsers
        });
    } catch (error) {
        console.error('Fetch ratings error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch ratings.' });
    }
});

app.get('/api/ratings/mine', authMiddleware, async (req, res) => {
    try {
        const { data: rating, error } = await supabase
            .from('ratings')
            .select('*')
            .eq('user_id', req.user.id)
            .single();

        res.json({ rating: rating || null });
    } catch (error) {
        console.error('Fetch my rating error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch your rating.' });
    }
});

// ── DETAILED STATS ROUTE ─────────────────────

app.get('/api/stats/detailed', authMiddleware, heavyEndpointLimiter, cache(300), async (req, res) => {
    try {
        const wibOffset = 7 * 60 * 60 * 1000;
        const now = new Date();

        const wibNow = new Date(now.getTime() + wibOffset);
        const todayStartWIB = new Date(Date.UTC(wibNow.getUTCFullYear(), wibNow.getUTCMonth(), wibNow.getUTCDate()) - wibOffset);

        const sevenDaysAgoStart = new Date(todayStartWIB.getTime() - 6 * 24 * 60 * 60 * 1000);

        const { data: itemsSince, error } = await supabase
            .from('items')
            .select('*')
            .gte('reported_at', sevenDaysAgoStart.toISOString())
            .order('reported_at', { ascending: true });

        if (error) throw error;

        const itemsPerDay = [];
        for (let i = 0; i < 7; i++) {
            const dayStartUTC = new Date(sevenDaysAgoStart.getTime() + i * 24 * 60 * 60 * 1000);
            const dayEndUTC = new Date(dayStartUTC.getTime() + 24 * 60 * 60 * 1000 - 1);

            const dayStartWIB = new Date(dayStartUTC.getTime() + wibOffset);
            const y = dayStartWIB.getUTCFullYear();
            const m = String(dayStartWIB.getUTCMonth() + 1).padStart(2, '0');
            const d = String(dayStartWIB.getUTCDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${d}`;

            const dayItems = itemsSince.filter(item =>
                new Date(item.reported_at) >= dayStartUTC && new Date(item.reported_at) <= dayEndUTC
            );

            const { data: dc } = await supabase
                .from('daily_counters')
                .select('returned')
                .eq('date', dateStr)
                .single();

            itemsPerDay.push({
                date: dateStr,
                lost: dayItems.filter(i => i.type === 'lost').length,
                found: dayItems.filter(i => i.type === 'found').length,
                returned: dc?.returned || 0
            });
        }

        const { data: allItems } = await supabase.from('items').select('*');

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

        const categoryCount = {};
        allItems.forEach(item => {
            const cat = item.category?.trim() || 'Others';
            categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        });
        const topCategories = Object.entries(categoryCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([category, count]) => ({ category, count }));

        const totalItems = allItems.length;
        const { data: counterDoc } = await supabase
            .from('counters')
            .select('value')
            .eq('name', 'returnedAllTime')
            .single();
        const totalReturned = counterDoc?.value || 0;
        const returnRate = totalItems > 0 ? Math.round((totalReturned / totalItems) * 100) : 0;

        const mostCommonLocation = topLocations[0]?.location || 'N/A';
        const mostLostCategory = topCategories[0]?.category || 'N/A';

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayCount = [0, 0, 0, 0, 0, 0, 0];
        allItems.forEach(item => {
            const day = new Date(item.reported_at).getDay();
            dayCount[day]++;
        });
        const busiestDayIndex = dayCount.indexOf(Math.max(...dayCount));
        const busiestDay = dayNames[busiestDayIndex];

        const returnedItems = allItems.filter(i => i.status === 'Returned' && i.claimed_at);
        let totalHours = 0;
        let avgHours = 0;
        if (returnedItems.length > 0) {
            totalHours = returnedItems.reduce((sum, item) => {
                const reported = new Date(item.reported_at).getTime();
                const claimed = new Date(item.claimed_at).getTime();
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

// Reassign claimer
app.post('/api/items/:id/resolve',
    authMiddleware,
    [
        param('id').isUUID().withMessage('Invalid item ID'),
        body('userId').isUUID().withMessage('Invalid user ID'),
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            console.log('[resolve] reporterId:', req.user.id, 'itemId:', req.params.id, 'newClaimer:', req.body.userId);

            const { data: item, error } = await supabase
                .from('items')
                .select('*')
                .eq('id', req.params.id)
                .single();

            if (error || !item) return res.status(404).json({ success: false, message: 'Item not found' });

            console.log('[resolve] item reporter:', item.reporter, '| current user:', req.user.id);
            console.log('[resolve] reporter === userId?', item.reporter === req.user.id);

            if (item.reporter !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Only founder can assign claimer' });
            }

            const { error: updateError } = await supabase
                .from('items')
                .update({ claimer: req.body.userId })
                .eq('id', req.params.id);

            if (updateError) {
                console.log('[resolve] update error:', updateError.message);
                throw updateError;
            }
            console.log('[resolve] update succeeded');

            await supabase
                .from('complaints')
                .delete()
                .eq('item_id', req.params.id)
                .eq('user_id', req.body.userId);

            await supabase
                .from('notifications')
                .insert({
                    user_id: req.body.userId,
                    type: 'resolved',
                    item_id: req.params.id,
                    text: `You have been assigned as the claimer for: ${item.name}`
                });

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
        const { data: notifs, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        res.json(notifs);
    } catch (error) {
        console.error('Fetch notifications error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
    }
});

app.delete('/api/notifications', authMiddleware, async (req, res) => {
    try {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('user_id', req.user.id);

        if (error) throw error;

        res.json({ success: true });
    } catch (error) {
        console.error('Delete all notifications error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to delete notifications.' });
    }
});

app.delete('/api/notifications/:id', authMiddleware, async (req, res) => {
    try {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', req.params.id)
            .eq('user_id', req.user.id);

        if (error) throw error;

        res.json({ success: true });
    } catch (error) {
        console.error('Delete notification error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to delete notification.' });
    }
});

app.post('/api/notifications/:id/read', authMiddleware, async (req, res) => {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', req.params.id)
            .eq('user_id', req.user.id);

        if (error) throw error;

        res.json({ success: true });
    } catch (error) {
        console.error('Mark as read error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to mark notification as read.' });
    }
});

// ── CATCH-ALL ────────────────────────────────
app.use('/api', (req, res) => {
    res.status(404).json({ success: false, message: 'API route not found.' });
});

app.use((err, req, res, next) => {
    console.error('💥 Unhandled Error Stack:', err.stack || err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ─────────────────────────────────────────────
// 5. SOCKET.IO & SERVER START
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

io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
        return next(new Error('Authentication required'));
    }
    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            return next(new Error('Invalid or expired token'));
        }
        socket.userId = user.id;
        next();
    } catch (err) {
        next(new Error('Authentication error'));
    }
});

const socketRateLimit = new Map();
const SOCKET_RATE_LIMIT_WINDOW = 10000;
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
            const { data: item } = await supabase
                .from('items')
                .select('reporter, claimer')
                .eq('id', itemId)
                .single();

            if (!item) return;
            const uid = socket.userId;
            const isReporter = item.reporter === uid;
            const isClaimer = item.claimer && item.claimer === uid;
            if (isReporter || isClaimer) {
                socket.join(`item-${itemId}`);
            }
        } catch (e) {
            // silently ignore
        }
    });

    socket.on('send-message', async (data) => {
        if (!checkSocketRateLimit(socket.id)) {
            socket.emit('rate-limited', { message: 'Too many messages. Please slow down.' });
            return;
        }
        socket.broadcast.to(`item-${data.itemId}`).emit('new-message', data);
    });

    socket.on('disconnect', () => {
        socketRateLimit.delete(socket.id);
        console.log('🔌 Socket disconnected:', socket.userId);
    });
});

// ─────────────────────────────────────────────
// 6. CRON JOBS (Auto Cleanup)
// ─────────────────────────────────────────────
const runCleanupJob = async () => {
    console.log('🧹 Running Auto-Cleanup Job...');

    try {
        const tenDaysAgo = new Date(
            new Date().setDate(new Date().getDate() - 10)
        );

        const twoDaysAgo = new Date(
            new Date().setDate(new Date().getDate() - 2)
        );

        const { data: expiredUnclaimed } = await supabase
            .from('items')
            .select('*')
            .neq('status', 'Returned')
            .lte('reported_at', tenDaysAgo.toISOString());

        const { data: expiredReturned } = await supabase
            .from('items')
            .select('*')
            .eq('status', 'Returned')
            .lte('claimed_at', twoDaysAgo.toISOString());

        const itemsToDelete = [
            ...(expiredUnclaimed || []),
            ...(expiredReturned || [])
        ];

        console.log(`🗑️ Found ${itemsToDelete.length} items.`);

        for (const item of itemsToDelete) {
            if (item.image_url?.includes('cloudinary')) {
                try {
                    const publicId = extractCloudinaryPublicId(item.image_url);
                    if (publicId) {
                        await cloudinary.uploader.destroy(publicId);
                        console.log(`☁️ Deleted image: ${publicId}`);
                    }
                } catch (cloudinaryErr) {
                    console.error('Cloudinary delete failed:', cloudinaryErr.message);
                }
            }

            await supabase
                .from('notifications')
                .insert({
                    user_id: item.reporter,
                    type: 'system',
                    item_id: null,
                    text: `Laporan "${item.name}" telah dihapus otomatis.`
                });

            await supabase
                .from('notifications')
                .delete()
                .eq('item_id', item.id);

            await supabase
                .from('items')
                .delete()
                .eq('id', item.id);

            console.log(`🗑️ Deleted item: ${item.name}`);
        }

        console.log('✅ Cleanup complete');
    } catch (error) {
        console.error('❌ Cleanup failed:', error.message);
    }
};

cron.schedule('0 * * * *', async () => {
    await runCleanupJob();
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
});
