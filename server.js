const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import route files
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const divisionRoutes = require('./routes/divisionRoutes');
const branchRoutes = require('./routes/branchRoutes');
const customerRoutes = require('./routes/customerRoutes');
const pickupRequestRoutes = require('./routes/pickupRequestRoutes');
const pickupRoutes = require('./routes/pickupRoutes');
const sttRoutes = require('./routes/sttRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const loadingRoutes = require('./routes/loadingRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const returnRoutes = require('./routes/returnRoutes');
const collectionRoutes = require('./routes/collectionRoutes');
const financeRoutes = require('./routes/financeRoutes');
const assetRoutes = require('./routes/assetRoutes');
const reportRoutes = require('./routes/reportRoutes');
const mobileRoutes = require('./routes/mobileRoutes');

// Import middlewares and utilities
const errorHandler = require('./middlewares/errorHandler');
const { connectDB } = require('./config/db');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logger middleware for development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Set static folder for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/divisions', divisionRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/pickup-requests', pickupRequestRoutes);
app.use('/api/pickups', pickupRoutes);
app.use('/api/stt', sttRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/loadings', loadingRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/mobile', mobileRoutes);

// Base route for API
app.get('/api', (req, res) => {
  res.json({
    message: 'Welcome to Samudra ERP API',
    version: '1.0.0'
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`.red);
  // Close server & exit process
  server.close(() => process.exit(1));
});