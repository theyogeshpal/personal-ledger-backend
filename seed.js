import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  password: { type: String, select: false },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');

    const existing = await User.findOne({ email: 'theyogeshpal@gmail.com' });
    if (existing) {
      console.log('Admin user already exists, skipping seed.');
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Kmc@2004', salt);

    await User.create({
      name: 'Yogesh Pal',
      email: 'theyogeshpal@gmail.com',
      password: hashedPassword,
    });

    console.log('✅ Admin user seeded successfully!');
    console.log('   Email   : theyogeshpal@gmail.com');
    console.log('   Password: Kmc@2004');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
};

seed();
