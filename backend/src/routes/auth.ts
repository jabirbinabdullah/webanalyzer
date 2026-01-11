import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { validate } from '../middleware/validation.js'; // Generic validation middleware
import { protect } from '../middleware/auth.js';
import { z } from 'zod'; // Import Zod

const router = express.Router();

// Define Zod schemas for authentication
const registerSchema = z.object({
    body: z.object({
        name: z
            .string()
            .min(3, 'Name is required and must be at least 3 characters'),
        email: z.string().email('Invalid email format'),
        password: z
            .string()
            .min(6, 'Password is required and must be at least 6 characters'),
    }),
});

const loginSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email format'),
        password: z.string().min(1, 'Password is required'), // Password might be short for login check
    }),
});

const updateProfileSchema = z.object({
    body: z.object({
        name: z.string().min(3, 'Name must be at least 3 characters').optional(),
        email: z.string().email('Invalid email format').optional(),
        emailNotifications: z.boolean().optional(),
    }),
});

// Function to generate JWT
function generateToken(user: any) {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined in environment');
    }
    return jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, {
        expiresIn: '1d',
    });
}

router.post('/register', validate(registerSchema), async (req: Request, res: Response) => {
    const { name, email, password } = req.body;

    try {
        let user = await User.findOne({ email });
        if (user) {
            return res
                .status(400)
                .json({ errors: [{ message: 'User already exists', field: 'email' }] });
        }

        user = new User({ name, email, password });
        await user.save();

        const token = generateToken(user);
        res.status(201).json({
            token,
            user: { id: user.id, name: user.name, email: user.email },
        });
    } catch (err: any) {
        console.error('Register error:', err.message);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const token = generateToken(user);
        res.json({
            token,
            user: { id: user.id, name: user.name, email: user.email },
        });
    } catch (err: any) {
        console.error('Login error:', err.message);
        res.status(500).json({ error: 'Server error during login' });
    }
});

router.get('/me', protect, async (req: any, res: Response) => {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
});

router.put('/me', protect, validate(updateProfileSchema), async (req: any, res: Response) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        if (req.body.emailNotifications !== undefined) {
            user.emailNotifications = req.body.emailNotifications;
        }

        await user.save();
        res.json(user);
    } catch (err: any) {
        console.error('Update profile error:', err.message);
        res.status(500).json({ error: 'Server error during profile update' });
    }
});

export default router;
