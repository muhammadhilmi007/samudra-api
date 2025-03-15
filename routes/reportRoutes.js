const express = require('express');
const {
  getLoadingManifestReport,
  getSalesReport,
  getSalesReportByBranch,
  getRevenueReport,
  getMonthlyRevenueReport,
  getDailyRevenueReport,
  getReturnReport,
  getReceivablesReport,
  getCollectionsReport,
  getDailyCashReportByBranch,
  getBalanceSheet,
  getProfitLossReport,
  getDashboardStats,
  exportReport
} = require('../controllers/reportController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// Loading reports
router.get('/loading-manifest', getLoadingManifestReport);

// Sales reports
router.get('/sales', getSalesReport);
router.get('/sales-by-branch/:branchId', getSalesReportByBranch);

// Revenue reports
router.get('/revenue', getRevenueReport);
router.get('/revenue/monthly', getMonthlyRevenueReport);
router.get('/revenue/daily', getDailyRevenueReport);

// Other operational reports
router.get('/returns', getReturnReport);
router.get('/receivables', getReceivablesReport);
router.get('/collections', getCollectionsReport);

// Financial reports
router.get('/cash-daily/:branchId', getDailyCashReportByBranch);
router.get('/balance-sheet', authorize('direktur', 'manajer_keuangan'), getBalanceSheet);
router.get('/profit-loss', authorize('direktur', 'manajer_keuangan'), getProfitLossReport);

// Dashboard
router.get('/dashboard-stats', getDashboardStats);

// Export
router.get('/export/:reportType', exportReport);

module.exports = router;