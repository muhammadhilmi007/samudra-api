// config/db.js
const mongoose = require('mongoose');
const config = require('./config');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || config.mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline);
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`.red.bold);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('MongoDB disconnected'.yellow);
  } catch (error) {
    console.error(`Error disconnecting from MongoDB: ${error.message}`.red.bold);
  }
};

module.exports = { connectDB, disconnectDB };