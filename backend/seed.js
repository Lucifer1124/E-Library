const mongoose = require('mongoose');
const User = require('./src/users/user.model');
require('dotenv').config();

async function seedAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.DB_URL);
    console.log('MongoDB connected successfully!');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@bookstore.com' });
    if (existingAdmin) {
      console.log('Admin user already exists!');
      process.exit(0);
    }

    // Create admin user
    const adminUser = new User({
      username: 'admin',
      email: 'admin@bookstore.com',
      password: 'admin@12345',
      role: 'admin'
    });

    await adminUser.save();
    console.log('Admin user created successfully!');

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

seedAdmin();
