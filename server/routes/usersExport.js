const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const User = require('../models/User');
const excelExportService = require('../utils/excelExportService');
const DynamicWarehouseLayout = require('../models/DynamicWarehouseLayout');

// @route   GET /api/exports/users-excel
// @desc    Export all users (owners and customers) to Excel with join/leave dates
// @access  Private (Owner only)
router.get('/users-excel', auth, authorize(['owner']), async (req, res) => {
    try {
        // Fetch all owners and customers
        const users = await User.find({
            role: { $in: ['owner', 'customer'] }
        }).sort({ createdAt: -1 });

        // Get additional data for each user
        const usersWithDetails = await Promise.all(users.map(async (user) => {
            let leftDate = null;
            
            // For customers, check if they've vacated (no active allocations)
            if (user.role === 'customer') {
                const activeAllocations = await DynamicWarehouseLayout.countDocuments({
                    'layout.blocks.slots.allocations.customer': user._id
                });
                
                // If no active allocations, find the last allocation date as leave date
                if (activeAllocations === 0) {
                    const lastAllocation = await DynamicWarehouseLayout.findOne({
                        'layout.blocks.slots.allocations.customer': user._id
                    }).sort({ 'layout.blocks.slots.allocations.timestamp': -1 });
                    
                    if (lastAllocation) {
                        // Find the latest allocation timestamp for this customer
                        for (const building of lastAllocation.layout) {
                            for (const block of building.blocks) {
                                for (const slot of block.slots) {
                                    const customerAllocs = slot.allocations.filter(
                                        a => a.customer && a.customer.toString() === user._id.toString()
                                    );
                                    if (customerAllocs.length > 0) {
                                        const latestAlloc = customerAllocs.sort((a, b) => 
                                            new Date(b.timestamp) - new Date(a.timestamp)
                                        )[0];
                                        leftDate = latestAlloc.timestamp;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            return {
                ...user.toObject(),
                leftDate
            };
        }));

        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Users');

        // Define columns
        worksheet.columns = [
            { header: 'S.No', key: 'sno', width: 10 },
            { header: 'Role', key: 'role', width: 15 },
            { header: 'Username', key: 'username', width: 20 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'First Name', key: 'firstName', width: 20 },
            { header: 'Last Name', key: 'lastName', width: 20 },
            { header: 'Phone', key: 'phone', width: 20 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Date Joined', key: 'dateJoined', width: 25 },
            { header: 'Date Left', key: 'dateLeft', width: 25 }
        ];

        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        };
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

        // Add data rows
        usersWithDetails.forEach((user, index) => {
            worksheet.addRow({
                sno: index + 1,
                role: user.role.toUpperCase(),
                username: user.username,
                email: user.email,
                firstName: user.profile?.firstName || 'N/A',
                lastName: user.profile?.lastName || 'N/A',
                phone: user.profile?.phone || 'N/A',
                status: user.isActive ? 'Active' : 'Inactive',
                dateJoined: new Date(user.createdAt).toLocaleString('en-IN'),
                dateLeft: user.leftDate ? new Date(user.leftDate).toLocaleString('en-IN') : 'Still Active'
            });
        });

        // Alternating row colors
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1 && rowNumber % 2 === 0) {
                row.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF0F0F0' }
                };
            }
        });

        // Generate Excel file
        const buffer = await workbook.xlsx.writeBuffer();

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=users_export_${Date.now()}.xlsx`);
        
        res.send(buffer);

    } catch (error) {
        console.error('Users Excel export error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export users data',
            error: error.message
        });
    }
});

module.exports = router;
