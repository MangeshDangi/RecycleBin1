const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const app = express();

// Add this before your routes
process.env.ADMIN_SECRET = 'your-admin-token-here'; // Replace with a secure token

// Enable CORS and proper middleware
app.use(cors({
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:5502', 'http://127.0.0.1:5502'], // Allow both localhost variations
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'admin-token']
}));
app.use(express.json());
app.use(express.static('.'));
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`); // Log all requests
    next();
});

// Add options handling for preflight requests
app.options('*', cors());

// MongoDB Connection with better error handling
const connectDB = async () => {
    try {
        await mongoose.connect('mongodb+srv://mangeshdangi5:admin@cluster0.jxxcl.mongodb.net/SmartBin', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            family: 4
        });
        console.log('✅ MongoDB Connected Successfully');

        // Test database connection
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('📚 Available collections:', collections.map(c => c.name));

    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1); // Exit if database connection fails
    }
};

// Initial connection attempt
connectDB();

// Handle connection errors
mongoose.connection.on('error', err => {
    console.error('MongoDB error:', err);
});

// Handle disconnection
mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected! Attempting to reconnect...');
    connectDB();
});

// Define Schemas
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    points: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

const CodeSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    points: { type: Number, required: true },
    used: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const TransactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['EARN', 'REDEEM'], required: true },
    points: { type: Number, required: true },
    code: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const SensorCodeSchema = new mongoose.Schema({
    sensorId: { type: String, required: true },
    code: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const RedeemCodeSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rewardType: { type: String, required: true },
    pointsCost: { type: Number, required: true },
    isUsed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true }
});

// Create models
const User = mongoose.model('User', UserSchema);
const Code = mongoose.model('Code', CodeSchema);
const Transaction = mongoose.model('Transaction', TransactionSchema);
const SensorCode = mongoose.model('SensorCode', SensorCodeSchema);
const RedeemCode = mongoose.model('RedeemCode', RedeemCodeSchema);

// Enhanced signup endpoint with better error handling
app.post('/api/auth/signup', async (req, res) => {
    console.log('Received signup request:', req.body); // Debug log

    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            points: 0
        });

        console.log('User created successfully:', user); // Debug log

        res.json({
            success: true,
            userId: user._id,
            message: 'User registered successfully'
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating account: ' + error.message
        });
    }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
    console.log('Login request received:', {
        email: req.body.email,
        hasPassword: !!req.body.password
    });

    try {
        const { email, password } = req.body;

        if (!email || !password) {
            console.log('Missing credentials');
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        const user = await User.findOne({ email });
        console.log('User found:', user ? 'Yes' : 'No');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        console.log('Password valid:', validPassword);

        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        console.log('Login successful for user:', user.email);

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                points: user.points
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
// Enhanced submit code endpoint
app.post('/api/submit-code', async (req, res) => {
    console.log('📥 Received code submission:', req.body);

    try {
        const { code, userId } = req.body;

        if (!code || !userId) {
            return res.status(400).json({
                success: false,
                message: 'Code and user ID are required'
            });
        }

        // Find the user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Find the sensor code
        const sensorCode = await SensorCode.findOne({ code });
        console.log('🔍 Found sensor code:', sensorCode);

        if (!sensorCode) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or already used code'
            });
        }

        // Generate random points between 50 and 150
        const pointsToAward = Math.floor(Math.random() * (150 - 50 + 1)) + 50;

        // Create transaction record
        const transaction = await Transaction.create({
            userId,
            type: 'EARN',
            points: pointsToAward,
            code: code
        });

        // Update user points
        user.points += pointsToAward;
        await user.save();

        // Delete the used sensor code
        await SensorCode.findByIdAndDelete(sensorCode._id);

        console.log('✅ Points awarded:', {
            userId,
            oldPoints: user.points - pointsToAward,
            newTotal: user.points,
            pointsAwarded: pointsToAward
        });

        res.status(200).json({
            success: true,
            points: pointsToAward,
            newTotal: user.points,
            message: `Congratulations! You earned ${pointsToAward} points!`
        });

    } catch (error) {
        console.error('❌ Error processing code:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing code'
        });
    }
});

// Redeem points endpoint
app.post('/api/redeem', async (req, res) => {
    try {
        const { points, userId, rewardType } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.points < points) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient points'
            });
        }

        // Generate unique coupon code
        const couponCode = await generateUniqueCouponCode();

        // Create redemption code
        const redeemCode = await RedeemCode.create({
            code: couponCode,
            userId: user._id,
            rewardType,
            pointsCost: points,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days expiry
        });

        // Create transaction record
        const transaction = await Transaction.create({
            userId: user._id,
            type: 'REDEEM',
            points: -points,
            code: couponCode
        });

        // Update user points
        user.points -= points;
        await user.save();

        res.json({
            success: true,
            code: couponCode,
            newBalance: user.points,
            expiresAt: redeemCode.expiresAt
        });

    } catch (error) {
        console.error('Error in redemption:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing redemption'
        });
    }
});

// Add endpoint to verify redemption code
app.get('/api/verify-code/:code', async (req, res) => {
    try {
        const code = await RedeemCode.findOne({ code: req.params.code })
            .populate('userId', 'name email');

        if (!code) {
            return res.status(404).json({
                success: false,
                message: 'Invalid redemption code'
            });
        }

        if (code.isUsed) {
            return res.status(400).json({
                success: false,
                message: 'Code has already been used'
            });
        }

        if (code.expiresAt < new Date()) {
            return res.status(400).json({
                success: false,
                message: 'Code has expired'
            });
        }

        res.json({
            success: true,
            code: {
                rewardType: code.rewardType,
                pointsCost: code.pointsCost,
                expiresAt: code.expiresAt,
                user: code.userId
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error verifying code'
        });
    }
});

// Add helper function to generate unique coupon codes
async function generateUniqueCouponCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code;
    let isUnique = false;

    while (!isUnique) {
        code = '';
        for (let i = 0; i < 12; i++) {
            if (i > 0 && i % 4 === 0) code += '-';
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        // Check if code exists
        const existingCode = await RedeemCode.findOne({ code });
        if (!existingCode) {
            isUnique = true;
        }
    }

    return code;
}

// Add endpoint to get user's redemption history
app.get('/api/redemptions/:userId', async (req, res) => {
    try {
        const redemptions = await RedeemCode.find({ 
            userId: req.params.userId 
        }).sort('-createdAt');

        res.json({
            success: true,
            redemptions: redemptions.map(r => ({
                code: r.code,
                rewardType: r.rewardType,
                pointsCost: r.pointsCost,
                isUsed: r.isUsed,
                createdAt: r.createdAt,
                expiresAt: r.expiresAt
            }))
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching redemption history'
        });
    }
});

// Add GET endpoint for testing save_code
app.get('/save_code', (req, res) => {
    res.send(`
        <form action="/save_code" method="POST">
            <label for="sensorId">Sensor ID:</label><br>
            <input type="text" id="sensorId" name="sensorId"><br>
            <label for="code">Code:</label><br>
            <input type="text" id="code" name="code"><br>
            <input type="submit" value="Submit">
        </form>
    `);
});

// Save code from ESP32 endpoint with enhanced validation
app.post('/save_code', async (req, res) => {
    console.log('📥 Received data from ESP32:', req.body);

    try {
        const { sensorId } = req.body;

        if (!sensorId) {
            console.log('❌ Missing required fields');
            return res.status(400).json({
                success: false,
                message: '❌ Missing sensorId'
            });
        }

        // Generate a new 6-digit code
        const code = generateSensorCode();

        // Check for duplicate code
        const existingCode = await SensorCode.findOne({ code });
        if (existingCode) {
            return res.status(409).json({
                success: false,
                message: '❌ Code conflict, please try again'
            });
        }

        // Save code in the database
        const newCode = await SensorCode.create({
            sensorId,
            code,
            createdAt: new Date()
        });

        console.log('✅ Code saved successfully:', newCode);

        res.json({
            success: true,
            message: '✅ Code saved successfully',
            data: {
                code: newCode.code,
                sensorId: newCode.sensorId,
                createdAt: newCode.createdAt
            }
        });
    } catch (error) {
        console.error('❌ Error saving code:', error);
        res.status(500).json({
            success: false,
            message: '❌ Server error: ' + error.message
        });
    }
});

// Update or fix the user data endpoint
app.get('/api/user-data/:userId', async (req, res) => {
    try {
        console.log('Fetching user data for ID:', req.params.userId); // Debug log
        
        const userId = req.params.userId;
        const user = await User.findById(userId);
        
        if (!user) {
            console.log('User not found:', userId); // Debug log
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        console.log('Found user:', { 
            id: user._id,
            points: user.points,
            name: user.name 
        }); // Debug log

        // Get today's transactions
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todaysTransactions = await Transaction.find({
            userId: userId,
            type: 'EARN',
            createdAt: { $gte: today }
        });

        const todaysPoints = todaysTransactions.reduce((sum, tx) => sum + tx.points, 0);

        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                points: user.points || 0, // Ensure points is never undefined
                tier: calculateUserTier(user.points || 0)
            },
            todaysPoints,
            timestamp: new Date() // Add timestamp for debugging
        });
    } catch (error) {
        console.error('Error in /api/user-data:', error); // Debug log
        res.status(500).json({
            success: false,
            message: 'Error fetching user data: ' + error.message
        });
    }
});

// Admin middleware
const adminAuth = async (req, res, next) => {
    try {
        // Handle preflight requests
        if (req.method === 'OPTIONS') {
            return next();
        }

        const adminToken = req.headers['admin-token'];
        if (!adminToken || adminToken !== process.env.ADMIN_SECRET) {
            return res.status(401).json({ 
                success: false, 
                message: 'Unauthorized' 
            });
        }
        next();
    } catch (error) {
        console.error('Admin auth error:', error);
        res.status(401).json({ 
            success: false, 
            message: 'Authentication failed' 
        });
    }
};

// Admin Routes
app.get('/api/admin/dashboard-stats', adminAuth, async (req, res) => {
    try {
        const stats = await Promise.all([
            // Get user statistics
            User.aggregate([
                {
                    $facet: {
                        total: [{ $count: 'count' }],
                        weeklyGrowth: [
                            {
                                $match: {
                                    createdAt: {
                                        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                                    }
                                }
                            },
                            { $count: 'count' }
                        ]
                    }
                }
            ]),
            // Get sensor count
            SensorCode.countDocuments(),
            // Get points statistics
            User.aggregate([
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$points' },
                        avgPerUser: { $avg: '$points' }
                    }
                }
            ]),
            // Get transaction statistics
            Transaction.aggregate([
                {
                    $facet: {
                        total: [{ $count: 'count' }],
                        today: [
                            {
                                $match: {
                                    createdAt: {
                                        $gte: new Date(new Date().setHours(0, 0, 0, 0))
                                    }
                                }
                            },
                            { $count: 'count' }
                        ],
                        pointsToday: [
                            {
                                $match: {
                                    createdAt: {
                                        $gte: new Date(new Date().setHours(0, 0, 0, 0))
                                    },
                                    type: 'EARN'
                                }
                            },
                            {
                                $group: {
                                    _id: null,
                                    total: { $sum: '$points' }
                                }
                            }
                        ]
                    }
                }
            ])
        ]);

        res.json({
            success: true,
            data: {
                users: stats[0],
                sensors: stats[1],
                points: stats[2],
                transactions: stats[3]
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard statistics'
        });
    }
});

// Update the admin users endpoint to include more details
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await User.find()
            .select('-password')
            .sort('-createdAt');

        const usersWithStats = await Promise.all(users.map(async (user) => {
            const transactions = await Transaction.find({ userId: user._id });
            return {
                ...user.toObject(),
                totalTransactions: transactions.length,
                lastActivity: transactions.length > 0
                    ? transactions[transactions.length - 1].createdAt
                    : null
            };
        }));

        res.json({
            success: true,
            users: usersWithStats,
            totalUsers: usersWithStats.length,
            totalPoints: usersWithStats.reduce((sum, user) => sum + (user.points || 0), 0)
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Add endpoint to get single user details
app.get('/api/admin/users/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete('/api/admin/users/:userId', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.userId);
        await Transaction.deleteMany({ userId: req.params.userId });
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.put('/api/admin/users/:userId', async (req, res) => {
    try {
        const { name, email, points } = req.body;
        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { name, email, points },
            { new: true }
        ).select('-password');
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message }); // Fixed syntax error here
    }
});

app.get('/api/admin/transactions', adminAuth, async (req, res) => {
    try {
        const transactions = await Transaction.find()
            .populate('userId', 'name email')
            .sort('-createdAt');
        res.json({ success: true, transactions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete('/api/admin/transactions/:transactionId', adminAuth, async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.transactionId);
        if (!transaction) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }

        // Reverse the points effect on user
        const user = await User.findById(transaction.userId);
        if (user) {
            user.points -= transaction.type === 'EARN' ? transaction.points : -transaction.points;
            await user.save();
        }

        await Transaction.findByIdAndDelete(req.params.transactionId);
        res.json({ success: true, message: 'Transaction deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Dashboard Stats API
app.get('/api/admin/dashboard-stats', async (req, res) => {
    try {
        const stats = {
            users: await User.aggregate([
                {
                    $facet: {
                        total: [{ $count: 'count' }],
                        weeklyGrowth: [
                            {
                                $match: {
                                    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                                }
                            },
                            { $count: 'count' }
                        ]
                    }
                }
            ]),
            sensors: await SensorCode.countDocuments(),
            points: await User.aggregate([
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$points' },
                        avgPerUser: { $avg: '$points' }
                    }
                }
            ]),
            transactions: await Transaction.aggregate([
                {
                    $facet: {
                        total: [{ $count: 'count' }],
                        today: [
                            {
                                $match: {
                                    createdAt: {
                                        $gte: new Date(new Date().setHours(0, 0, 0, 0))
                                    }
                                }
                            },
                            { $count: 'count' }
                        ],
                        pointsToday: [
                            {
                                $match: {
                                    createdAt: {
                                        $gte: new Date(new Date().setHours(0, 0, 0, 0))
                                    }
                                }
                            },
                            { $group: { _id: null, total: { $sum: '$points' } } }
                        ]
                    }
                }
            ]),
            activityData: await Transaction.aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                        }
                    }
                },
                {
                    $group: {
                        _id: {
                            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                        },
                        count: { $sum: 1 },
                        points: { $sum: '$points' }
                    }
                },
                { $sort: { '_id': 1 } }
            ])
        };

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard statistics'
        });
    }
});

// Sensor Code Management Endpoints
app.get('/api/admin/sensor-codes', async (req, res) => {
    try {
        console.log('Fetching sensor codes...'); // Debug log
        const codes = await SensorCode.find().sort('-createdAt');
        console.log(`Found ${codes.length} sensor codes`); // Debug log
        
        res.json({
            success: true,
            codes
        });
    } catch (error) {
        console.error('Error fetching sensor codes:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching sensor codes'
        });
    }
});

app.post('/api/admin/sensor-codes', async (req, res) => {
    try {
        console.log('Received request to generate sensor code:', req.body);
        const { sensorId } = req.body;

        // Validate sensorId
        if (!sensorId || typeof sensorId !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Invalid or missing sensorId'
            });
        }

        // Generate unique code with retries
        let code;
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 10;

        while (!isUnique && attempts < maxAttempts) {
            code = generateSensorCode();
            // Check if code already exists
            const existingCode = await SensorCode.findOne({ code });
            if (!existingCode) {
                isUnique = true;
            }
            attempts++;
        }

        if (!isUnique) {
            throw new Error('Unable to generate unique code after multiple attempts');
        }

        // Create new sensor code
        const sensorCode = new SensorCode({
            sensorId,
            code,
            createdAt: new Date()
        });

        await sensorCode.save();
        console.log('Successfully generated sensor code:', sensorCode);

        res.status(200).json({
            success: true,
            sensorCode
        });

    } catch (error) {
        console.error('Error in sensor code generation:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error generating sensor code'
        });
    }
});

app.delete('/api/admin/sensor-codes/:id', async (req, res) => {
    try {
        console.log('Deleting sensor code:', req.params.id);
        await SensorCode.findByIdAndDelete(req.params.id);
        res.json({
            success: true,
            message: 'Sensor code deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting sensor code:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting sensor code'
        });
    }
});

// Helper function to generate unique sensor code
async function generateUniqueSensorCode() {
    try {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code;
        let isUnique = false;

        while (!isUnique) {
            code = '';
            for (let i = 0; i < 8; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }

            // Check if code exists
            const existingCode = await RedeemCode.findOne({ code });
            if (!existingCode) {
                isUnique = true;
            }
        }

        return code;
    } catch (error) {
        console.error('Error generating sensor code:', error);
        throw error;
    }
}

// Add new endpoint for eco stats
app.get('/api/eco-stats', async (req, res) => {
    try {
        // Get total points from all transactions instead of users
        const stats = await Transaction.aggregate([
            {
                $match: {
                    type: 'EARN' // Only count earned points
                }
            },
            {
                $group: {
                    _id: null,
                    totalPoints: { $sum: '$points' }
                }
            }
        ]);

        const totalPoints = stats[0]?.totalPoints || 0;

        res.json({
            success: true,
            totalPoints,
            treesCount: Math.floor(totalPoints / 100), // Calculate trees saved
            message: 'Eco stats retrieved successfully'
        });
    } catch (error) {
        console.error('Error fetching eco stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching eco stats'
        });
    }
});

// Add new endpoint for platform stats
app.get('/api/platform-stats', async (req, res) => {
    try {
        const [userCount, binCount, transactions] = await Promise.all([
            User.countDocuments(),
            SensorCode.countDocuments(),
            Transaction.aggregate([
                {
                    $match: { type: 'EARN' }
                },
                {
                    $group: {
                        _id: null,
                        totalRecycled: { $sum: '$points' }
                    }
                }
            ])
        ]);

        // Convert points to approximate kg (assuming 1 point ≈ 0.1 kg)
        const recycledKg = Math.floor((transactions[0]?.totalRecycled || 0) * 0.1);

        res.json({
            success: true,
            stats: {
                activeUsers: userCount,
                smartBins: binCount,
                wasteRecycled: recycledKg
            }
        });
    } catch (error) {
        console.error('Error fetching platform stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching platform statistics'
        });
    }
});

// Add user tier calculation helper
function calculateUserTier(points) {
    if (points >= 5000) return 'Elite';
    if (points >= 2500) return 'Gold';
    if (points >= 1000) return 'Silver';
    return 'Bronze';
}

// Add transaction history endpoint
app.get('/api/transactions/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { filter = 'all' } = req.query;

        let query = { userId: userId };
        if (filter === 'earned') {
            query.type = 'EARN';
        } else if (filter === 'redeemed') {
            query.type = 'REDEEM';
        }

        const transactions = await Transaction.find(query)
            .sort('-createdAt')
            .limit(20);

        res.json({
            success: true,
            transactions
        });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching transactions'
        });
    }
});

// Update the function to generate 6-digit codes
function generateSensorCode() {
    try {
        // Generate a random 6-digit number between 100000 and 999999
        const min = 100000;
        const max = 999999;
        const code = Math.floor(Math.random() * (max - min + 1)) + min;
        return code.toString();
    } catch (error) {
        console.error('Error generating sensor code:', error);
        throw new Error('Failed to generate code');
    }
}

const PORT = process.env.PORT || https://recyclebin1.onrender.com;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
}).on('error', (error) => {
    console.error('❌ Server error:', error);
});
