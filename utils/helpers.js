/**
 * Helper functions for the application
 */

/**
 * Format date to Indonesian locale
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
exports.formatDate = (date) => {
    return new Date(date).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };
  
  /**
   * Format date and time to Indonesian locale
   * @param {Date} date - Date to format
   * @returns {string} Formatted date and time string
   */
  exports.formatDateTime = (date) => {
    return new Date(date).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  /**
   * Format currency to IDR format
   * @param {number} amount - Amount to format
   * @returns {string} Formatted currency string
   */
  exports.formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  /**
   * Generate sequential number with leading zeros
   * @param {number} num - Number to format
   * @param {number} digits - Number of digits
   * @returns {string} Formatted number with leading zeros
   */
  exports.formatNumber = (num, digits = 4) => {
    const numStr = num.toString();
    if (numStr.length >= digits) {
      return numStr;
    }
    return '0'.repeat(digits - numStr.length) + numStr;
  };
  
  /**
   * Get first few characters of a string
   * @param {string} str - String to get characters from
   * @param {number} chars - Number of characters to get
   * @returns {string} First few characters of the string
   */
  exports.getChars = (str, chars = 3) => {
    if (!str) return '';
    return str.substring(0, chars).toUpperCase();
  };
  
  /**
   * Create date string in YYMMDD format
   * @returns {string} Date string in YYMMDD format
   */
  exports.getDateString = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return `${year}${month}${day}`;
  };
  
  /**
   * Create date string in DDMMYY format
   * @returns {string} Date string in DDMMYY format
   */
  exports.getReverseDateString = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return `${day}${month}${year}`;
  };
  
  /**
   * Calculate grand total from array of objects
   * @param {Array} array - Array of objects
   * @param {string} field - Field to sum
   * @returns {number} Sum of field values
   */
  exports.calculateTotal = (array, field) => {
    return array.reduce((total, item) => total + (item[field] || 0), 0);
  };
  
  /**
   * Group an array of objects by a field
   * @param {Array} array - Array of objects
   * @param {string} field - Field to group by
   * @returns {Object} Object grouped by field
   */
  exports.groupBy = (array, field) => {
    return array.reduce((groups, item) => {
      const group = item[field];
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {});
  };
  
  /**
   * Filter object properties by a list of allowed keys
   * @param {Object} obj - Object to filter
   * @param {Array} keys - Array of allowed keys
   * @returns {Object} Filtered object
   */
  exports.filterObject = (obj, keys) => {
    return Object.keys(obj)
      .filter(key => keys.includes(key))
      .reduce((newObj, key) => {
        newObj[key] = obj[key];
        return newObj;
      }, {});
  };
  
  /**
   * Calculate age of asset in years
   * @param {Date} purchaseDate - Date of purchase
   * @param {Date} currentDate - Current date
   * @returns {number} Age in years
   */
  exports.calculateAssetAge = (purchaseDate, currentDate = new Date()) => {
    const purchase = new Date(purchaseDate);
    const diffTime = Math.abs(currentDate - purchase);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays / 365;
  };
  
  /**
   * Calculate depreciated value
   * @param {number} initialValue - Initial value
   * @param {number} depreciationRate - Annual depreciation rate in percentage
   * @param {number} ageInYears - Age in years
   * @returns {number} Current value after depreciation
   */
  exports.calculateDepreciatedValue = (initialValue, depreciationRate, ageInYears) => {
    const depreciationFactor = Math.pow(1 - (depreciationRate / 100), ageInYears);
    return Math.max(0, initialValue * depreciationFactor);
  };
  
  /**
   * Calculate due date based on payment terms
   * @param {Date} invoiceDate - Invoice date
   * @param {number} terms - Payment terms in days
   * @returns {Date} Due date
   */
  exports.calculateDueDate = (invoiceDate, terms = 30) => {
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + terms);
    return dueDate;
  };
  
  /**
   * Check if a date is overdue
   * @param {Date} dueDate - Due date
   * @param {Date} currentDate - Current date
   * @returns {boolean} True if overdue
   */
  exports.isOverdue = (dueDate, currentDate = new Date()) => {
    return new Date(dueDate) < currentDate;
  };
  
  /**
   * Calculate days overdue
   * @param {Date} dueDate - Due date
   * @param {Date} currentDate - Current date
   * @returns {number} Days overdue
   */
  exports.daysOverdue = (dueDate, currentDate = new Date()) => {
    if (!exports.isOverdue(dueDate, currentDate)) return 0;
    
    const due = new Date(dueDate);
    const diffTime = Math.abs(currentDate - due);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  
  /**
   * Generate pagination result
   * @param {number} page - Current page
   * @param {number} limit - Items per page
   * @param {number} total - Total items
   * @returns {Object} Pagination result
   */
  exports.paginationResult = (page, limit, total) => {
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    
    const pagination = {};
    
    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }
    
    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }
    
    return {
      pagination,
      startIndex,
      endIndex,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  };
  
  /**
   * Calculate total pages for pagination
   * @param {number} total - Total items
   * @param {number} limit - Items per page
   * @returns {number} Total pages
   */
  exports.getTotalPages = (total, limit) => {
    return Math.ceil(total / limit);
  };