require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../src/models/User');

const createAdminUser = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/music_api');
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
      console.log(`Email: ${existingAdmin.email}`);
      console.log(`Role: ${existingAdmin.role}`);
      process.exit(0);
    }

    // Create admin user
    const adminData = {
      email: 'admin@musicapi.com',
      phone: '0123456789',
      password: 'admin123456',
      fullName: 'System Administrator',
      role: 'admin',
      isVerified: true,
      isActive: true,
      subscription: {
        type: 'premium',
        isActive: true,
        startDate: new Date()
      }
    };

    // Hash password
    const salt = await bcrypt.genSalt(12);
    adminData.password = await bcrypt.hash(adminData.password, salt);

    // Create admin user
    const adminUser = new User(adminData);
    await adminUser.save();

    console.log('✅ Admin user created successfully!');
    console.log(`Email: ${adminUser.email}`);
    console.log(`Password: admin123456`);
    console.log(`Role: ${adminUser.role}`);
    console.log('\n⚠️  IMPORTANT: Change the password after first login!');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the script
createAdminUser(); 