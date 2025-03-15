const mongoose = require('mongoose');
const colors = require('colors'); // Make sure colors package is installed

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline);
  } catch (error) {
    console.error(`Error: ${error.message}`.red);
    process.exit(1);
  }
};

// Export as an object with connectDB property to match the destructuring in server.js
module.exports = { connectDB };