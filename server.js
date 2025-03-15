const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Initialize express
const app = express();

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Set security headers
app.use(helmet());

// Enable CORS
app.use(cors());

// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Set static folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Define routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/divisions', require('./routes/divisionRoutes'));
app.use('/api/branches', require('./routes/branchRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/vehicles', require('./routes/vehicleRoutes'));
app.use('/api/pickup-requests', require('./routes/pickupRequestRoutes'));
app.use('/api/pickups', require('./routes/pickupRoutes'));
app.use('/api/stt', require('./routes/sttRoutes'));
app.use('/api/truck-queues', require('./routes/truckQueueRoutes'));
app.use('/api/loadings', require('./routes/loadingRoutes'));
app.use('/api/vehicle-queues', require('./routes/vehicleQueueRoutes'));
app.use('/api/deliveries', require('./routes/deliveryRoutes'));
app.use('/api/returns', require('./routes/returnRoutes'));
app.use('/api/collections', require('./routes/collectionRoutes'));
app.use('/api/accounts', require('./routes/accountRoutes'));
app.use('/api/journals', require('./routes/journalRoutes'));
app.use('/api/cash', require('./routes/cashRoutes'));
app.use('/api/bank-statements', require('./routes/bankStatementRoutes'));
app.use('/api/assets', require('./routes/assetRoutes'));
app.use('/api/pending-packages', require('./routes/pendingPackageRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/mobile', require('./routes/mobileRoutes'));

// Error handler middleware
app.use(require('./middlewares/errorHandler'));

// Handle 404 routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});