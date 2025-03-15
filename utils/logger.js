const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Create log file name based on current date
const getLogFileName = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}.log`;
};

// Log levels
const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

/**
 * Write log to file
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 */
const writeLog = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...meta
  };
  
  const logString = JSON.stringify(logEntry) + '\n';
  const logFilePath = path.join(logsDir, getLogFileName());
  
  // Write to log file
  fs.appendFile(logFilePath, logString, (err) => {
    if (err) {
      console.error(`Failed to write to log file: ${err.message}`);
    }
  });
  
  // Also log to console in development environment
  if (process.env.NODE_ENV === 'development') {
    const consoleMethod = level === LOG_LEVELS.ERROR ? 'error' : 
                         level === LOG_LEVELS.WARN ? 'warn' : 
                         level === LOG_LEVELS.INFO ? 'info' : 'log';
    
    console[consoleMethod](`[${timestamp}] [${level}] ${message}`, meta);
  }
};

/**
 * Logger object
 */
const logger = {
  error: (message, meta = {}) => writeLog(LOG_LEVELS.ERROR, message, meta),
  warn: (message, meta = {}) => writeLog(LOG_LEVELS.WARN, message, meta),
  info: (message, meta = {}) => writeLog(LOG_LEVELS.INFO, message, meta),
  debug: (message, meta = {}) => writeLog(LOG_LEVELS.DEBUG, message, meta),
  
  /**
   * Log HTTP request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  request: (req, res) => {
    const meta = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      statusCode: res.statusCode,
      userAgent: req.headers['user-agent'],
      userId: req.user ? req.user.id : 'guest'
    };
    
    writeLog(LOG_LEVELS.INFO, 'HTTP Request', meta);
  },
  
  /**
   * Log database operation
   * @param {string} operation - Database operation
   * @param {string} collection - Collection name
   * @param {string} documentId - Document ID
   * @param {Object} result - Operation result
   */
  db: (operation, collection, documentId, result) => {
    const meta = {
      operation,
      collection,
      documentId,
      result
    };
    
    writeLog(LOG_LEVELS.DEBUG, 'Database Operation', meta);
  }
};

module.exports = logger;