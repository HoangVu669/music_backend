const express = require('express');
const router = express.Router();
const { query } = require('express-validator');
const reportController = require('../../controllers/admin/reportController');
const { adminAuth } = require('../../middleware/admin');

// Validation rules
const getReportsValidation = [
  query('period').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('Invalid period')
];

// Routes
router.get('/', adminAuth, getReportsValidation, reportController.getReports);
router.get('/users', adminAuth, getReportsValidation, reportController.getUserReports);
router.get('/content', adminAuth, getReportsValidation, reportController.getContentReports);

module.exports = router;
