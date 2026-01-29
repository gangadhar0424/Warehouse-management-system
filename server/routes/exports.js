const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const excelExportService = require('../utils/excelExportService');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const StorageAllocation = require('../models/StorageAllocation');

// @route   GET /api/exports/transactions
// @desc    Export transactions to Excel
// @access  Private (Owner only)
router.get('/transactions', auth, authorize(['owner']), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        let query = {};
        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const transactions = await Transaction.find(query)
            .populate('customer', 'name email phone')
            .populate('vehicle')
            .sort({ createdAt: -1 });

        const result = await excelExportService.exportTransactions(transactions, req.user.id);

        res.json({
            success: true,
            message: 'Transactions exported successfully',
            ...result
        });

    } catch (error) {
        console.error('Transaction export error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export transactions'
        });
    }
});

// @route   GET /api/exports/customers
// @desc    Export customers to Excel
// @access  Private (Owner only)
router.get('/customers', auth, authorize(['owner']), async (req, res) => {
    try {
        const customers = await User.find({ role: 'customer' })
            .select('name email phone address company createdAt status')
            .sort({ createdAt: -1 });

        // Get additional stats for each customer
        const customersWithStats = await Promise.all(customers.map(async (customer) => {
            const totalTransactions = await Transaction.countDocuments({ customer: customer._id });
            const transactions = await Transaction.find({ customer: customer._id });
            const totalSpent = transactions.reduce((sum, t) => sum + (t.payment?.amount || 0), 0);
            
            return {
                ...customer.toObject(),
                totalTransactions,
                totalSpent
            };
        }));

        const result = await excelExportService.exportCustomers(customersWithStats, req.user.id);

        res.json({
            success: true,
            message: 'Customers exported successfully',
            ...result
        });

    } catch (error) {
        console.error('Customer export error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export customers'
        });
    }
});

// @route   GET /api/exports/vehicles
// @desc    Export vehicles to Excel
// @access  Private (Owner only)
router.get('/vehicles', auth, authorize(['owner']), async (req, res) => {
    try {
        const vehicles = await Vehicle.find()
            .sort({ createdAt: -1 });

        // Get additional stats for each vehicle
        const vehiclesWithStats = await Promise.all(vehicles.map(async (vehicle) => {
            const totalVisits = await Transaction.countDocuments({ vehicle: vehicle._id });
            const lastTransaction = await Transaction.findOne({ vehicle: vehicle._id })
                .sort({ createdAt: -1 });
            
            return {
                ...vehicle.toObject(),
                totalVisits,
                lastVisit: lastTransaction?.createdAt
            };
        }));

        const result = await excelExportService.exportVehicles(vehiclesWithStats, req.user.id);

        res.json({
            success: true,
            message: 'Vehicles exported successfully',
            ...result
        });

    } catch (error) {
        console.error('Vehicle export error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export vehicles'
        });
    }
});

// @route   GET /api/exports/storage-allocations
// @desc    Export storage allocations to Excel
// @access  Private (Owner only)
router.get('/storage-allocations', auth, authorize(['owner']), async (req, res) => {
    try {
        const { status } = req.query;
        
        let query = {};
        if (status) {
            query.status = status;
        }

        const allocations = await StorageAllocation.find(query)
            .populate('customer', 'name email phone')
            .populate('warehouse', 'name location')
            .sort({ createdAt: -1 });

        const result = await excelExportService.exportStorageAllocations(allocations, req.user.id);

        res.json({
            success: true,
            message: 'Storage allocations exported successfully',
            ...result
        });

    } catch (error) {
        console.error('Storage allocation export error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export storage allocations'
        });
    }
});

// @route   GET /api/exports/comprehensive-report
// @desc    Export comprehensive report with all data
// @access  Private (Owner only)
router.get('/comprehensive-report', auth, authorize(['owner']), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        let dateQuery = {};
        if (startDate && endDate) {
            dateQuery.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        // Fetch all data
        const [transactions, customers, vehicles, allocations] = await Promise.all([
            Transaction.find(dateQuery)
                .populate('customer', 'name email phone')
                .populate('vehicle')
                .sort({ createdAt: -1 }),
            
            User.find({ role: 'customer' })
                .select('name email phone address company createdAt')
                .sort({ createdAt: -1 }),
            
            Vehicle.find()
                .sort({ createdAt: -1 }),
            
            StorageAllocation.find(dateQuery)
                .populate('customer', 'name')
                .populate('warehouse', 'name')
                .sort({ createdAt: -1 })
        ]);

        // Calculate total revenue
        const totalRevenue = transactions.reduce((sum, t) => sum + (t.payment?.amount || 0), 0);

        const data = {
            transactions,
            customers,
            vehicles,
            allocations,
            totalRevenue
        };

        const result = await excelExportService.exportComprehensiveReport(data, req.user.id);

        res.json({
            success: true,
            message: 'Comprehensive report exported successfully',
            ...result
        });

    } catch (error) {
        console.error('Comprehensive report export error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export comprehensive report'
        });
    }
});

// @route   GET /api/exports/daily-report
// @desc    Export daily report
// @access  Private (Owner only)
router.get('/daily-report', auth, authorize(['owner']), async (req, res) => {
    try {
        const { date } = req.query;
        const reportDate = date ? new Date(date) : new Date();
        
        // Set start and end of day
        const startOfDay = new Date(reportDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(reportDate);
        endOfDay.setHours(23, 59, 59, 999);

        const transactions = await Transaction.find({
            createdAt: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        })
        .populate('customer', 'name email phone')
        .populate('vehicle')
        .sort({ createdAt: -1 });

        // Calculate daily stats
        const dailyStats = {
            totalTransactions: transactions.length,
            totalRevenue: transactions.reduce((sum, t) => sum + (t.payment?.amount || 0), 0),
            completedPayments: transactions.filter(t => t.payment?.status === 'completed').length,
            pendingPayments: transactions.filter(t => t.payment?.status === 'pending').length,
            uniqueVehicles: [...new Set(transactions.map(t => t.vehicle?.vehicleNumber).filter(Boolean))].length,
            uniqueCustomers: [...new Set(transactions.map(t => t.customer?._id).filter(Boolean))].length
        };

        const result = await excelExportService.exportTransactions(transactions, req.user.id);
        
        res.json({
            success: true,
            message: `Daily report for ${reportDate.toDateString()} exported successfully`,
            dailyStats,
            ...result
        });

    } catch (error) {
        console.error('Daily report export error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export daily report'
        });
    }
});

// @route   POST /api/exports/custom
// @desc    Export custom data based on filters
// @access  Private (Owner only)
router.post('/custom', auth, authorize(['owner']), async (req, res) => {
    try {
        const { 
            exportType, // 'transactions', 'customers', 'vehicles', 'allocations'
            filters,
            dateRange 
        } = req.body;

        let query = {};
        
        // Apply date range if provided
        if (dateRange?.startDate && dateRange?.endDate) {
            query.createdAt = {
                $gte: new Date(dateRange.startDate),
                $lte: new Date(dateRange.endDate)
            };
        }

        // Apply additional filters
        if (filters) {
            Object.assign(query, filters);
        }

        let result;
        
        switch (exportType) {
            case 'transactions':
                const transactions = await Transaction.find(query)
                    .populate('customer', 'name email phone')
                    .populate('vehicle')
                    .sort({ createdAt: -1 });
                result = await excelExportService.exportTransactions(transactions, req.user.id);
                break;
                
            case 'customers':
                const customers = await User.find({ role: 'customer', ...query })
                    .select('name email phone address company createdAt');
                result = await excelExportService.exportCustomers(customers, req.user.id);
                break;
                
            case 'vehicles':
                const vehicles = await Vehicle.find(query);
                result = await excelExportService.exportVehicles(vehicles, req.user.id);
                break;
                
            case 'allocations':
                const allocations = await StorageAllocation.find(query)
                    .populate('customer', 'name')
                    .populate('warehouse', 'name');
                result = await excelExportService.exportStorageAllocations(allocations, req.user.id);
                break;
                
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid export type'
                });
        }

        res.json({
            success: true,
            message: `${exportType} exported successfully`,
            ...result
        });

    } catch (error) {
        console.error('Custom export error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export data'
        });
    }
});

module.exports = router;