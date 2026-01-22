const express = require('express');
const { body, validationResult } = require('express-validator');
const Vehicle = require('../models/Vehicle');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/vehicles/entry
// @desc    Register vehicle entry
// @access  Private (Owner/Worker)
router.post('/entry', [auth, authorize('owner', 'worker')], [
  body('vehicleNumber').trim().notEmpty(),
  body('vehicleType').isIn(['truck', 'mini-truck', 'tractor', 'trailer', 'container', 'van', 'other']),
  body('driverName').trim().notEmpty(),
  body('driverPhone').trim().notEmpty(),
  body('customerName').trim().notEmpty(),
  body('customerPhone').trim().notEmpty(),
  body('customerEmail').isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      vehicleNumber,
      vehicleType,
      driverName,
      driverPhone,
      driverLicense,
      customerName,
      customerPhone,
      customerEmail,
      visitPurpose,
      capacity,
      cargo
    } = req.body;

    // Check if vehicle already exists and is active
    const existingVehicle = await Vehicle.findOne({
      vehicleNumber: vehicleNumber.toUpperCase(),
      status: { $in: ['entered', 'loaded', 'weighed'] }
    });

    if (existingVehicle) {
      return res.status(400).json({
        message: 'Vehicle is already in the warehouse',
        vehicle: existingVehicle
      });
    }

    // Find or create customer
    let customer = await User.findOne({ email: customerEmail.toLowerCase() });
    
    if (!customer) {
      // Generate temporary password (customer can change later)
      const tempPassword = `TEMP${Math.random().toString(36).slice(-8).toUpperCase()}`;
      
      // Create new customer account
      customer = new User({
        username: customerEmail.split('@')[0] + Math.random().toString(36).slice(-4),
        email: customerEmail.toLowerCase(),
        password: tempPassword, // Will be hashed by User model pre-save hook
        role: 'customer',
        profile: {
          firstName: customerName.split(' ')[0],
          lastName: customerName.split(' ').slice(1).join(' ') || '',
          phone: customerPhone
        },
        isActive: true,
        needsPasswordChange: true // Flag to indicate temp password
      });

      await customer.save();
      
      console.log(`New customer created: ${customer.email} with temp password: ${tempPassword}`);
      
      // In production, you would email this to the customer
      // For now, we'll return it in response (only for initial creation)
    }

    const vehicle = new Vehicle({
      vehicleNumber: vehicleNumber.toUpperCase(),
      vehicleType,
      driverName,
      driverPhone,
      driverLicense,
      ownerName: customerName,
      ownerPhone: customerPhone,
      visitPurpose: visitPurpose || 'weighing_only',
      capacity,
      cargo,
      customer: customer._id,
      entryTime: new Date(),
      status: visitPurpose === 'grain_loading' ? 'inside' : 'entered'
    });

    await vehicle.save();

    // Emit real-time update
    const updateType = visitPurpose === 'grain_loading' ? 'vehicle_loading' : 'vehicle_entry';
    req.io.emit(updateType, {
      vehicle,
      message: visitPurpose === 'grain_loading' 
        ? `Vehicle ${vehicleNumber} added to loading queue` 
        : `Vehicle ${vehicleNumber} entered for weighing`
    });

    res.status(201).json({
      message: 'Vehicle entry registered successfully',
      vehicle,
      customerCreated: customer.needsPasswordChange,
      customerEmail: customer.email,
      visitPurpose,
      tempPassword: customer.needsPasswordChange ? 'Sent to customer email' : undefined
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/vehicles
// @desc    Get all vehicles
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10, search } = req.query;
    
    const query = {};
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Search by vehicle number or driver name
    if (search) {
      query.$or = [
        { vehicleNumber: { $regex: search, $options: 'i' } },
        { driverName: { $regex: search, $options: 'i' } },
        { ownerName: { $regex: search, $options: 'i' } }
      ];
    }

    const vehicles = await Vehicle.find(query)
      .populate('customer', 'username email profile')
      .populate('weighBridgeData.weighBridgeOperator', 'username')
      .sort({ entryTime: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Vehicle.countDocuments(query);

    res.json({
      vehicles,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/vehicles/:id
// @desc    Get vehicle by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id)
      .populate('customer', 'username email profile')
      .populate('weighBridgeData.weighBridgeOperator', 'username profile');

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    res.json(vehicle);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/vehicles/:id/weigh
// @desc    Update weigh bridge data
// @access  Private (Owner/Worker)
router.put('/:id/weigh', [auth, authorize('owner', 'worker')], [
  body('grossWeight').isNumeric(),
  body('tareWeight').isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { grossWeight, tareWeight } = req.body;
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    vehicle.weighBridgeData = {
      grossWeight,
      tareWeight,
      netWeight: grossWeight - tareWeight,
      weighBridgeOperator: req.user.id
    };
    
    vehicle.status = 'weighed';
    await vehicle.save();

    // Emit real-time update
    req.io.emit('vehicle_weighed', {
      vehicle,
      message: `Vehicle ${vehicle.vehicleNumber} has been weighed`
    });

    res.json({
      message: 'Weigh bridge data updated successfully',
      vehicle
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/vehicles/:id/exit
// @desc    Process vehicle exit
// @access  Private (Owner/Worker)
router.put('/:id/exit', [auth, authorize('owner', 'worker')], async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    if (vehicle.paymentStatus !== 'paid') {
      return res.status(400).json({
        message: 'Cannot process exit. Payment is pending.'
      });
    }

    vehicle.status = 'exited';
    vehicle.exitTime = new Date();
    await vehicle.save();

    // Emit real-time update
    req.io.emit('vehicle_exit', {
      vehicle,
      message: `Vehicle ${vehicle.vehicleNumber} has exited`
    });

    res.json({
      message: 'Vehicle exit processed successfully',
      vehicle
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/vehicles/:id/charges
// @desc    Update vehicle charges
// @access  Private (Owner)
router.put('/:id/charges', [auth, authorize('owner')], [
  body('weighBridgeCharge').optional().isNumeric(),
  body('storageCharge').optional().isNumeric(),
  body('loadingCharge').optional().isNumeric(),
  body('otherCharges').optional().isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    vehicle.charges = {
      ...vehicle.charges,
      ...req.body
    };

    await vehicle.save();

    res.json({
      message: 'Vehicle charges updated successfully',
      vehicle
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/vehicles/stats/dashboard
// @desc    Get vehicle statistics for dashboard
// @access  Private (Owner)
router.get('/stats/dashboard', [auth, authorize('owner')], async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const stats = await Vehicle.aggregate([
      {
        $facet: {
          totalVehicles: [{ $count: "count" }],
          todayEntries: [
            { $match: { entryTime: { $gte: startOfDay, $lte: endOfDay } } },
            { $count: "count" }
          ],
          currentlyInside: [
            { $match: { status: { $in: ['entered', 'loaded', 'weighed'] } } },
            { $count: "count" }
          ],
          byStatus: [
            { $group: { _id: "$status", count: { $sum: 1 } } }
          ],
          byVehicleType: [
            { $group: { _id: "$vehicleType", count: { $sum: 1 } } }
          ]
        }
      }
    ]);

    const result = {
      totalVehicles: stats[0].totalVehicles[0]?.count || 0,
      todayEntries: stats[0].todayEntries[0]?.count || 0,
      currentlyInside: stats[0].currentlyInside[0]?.count || 0,
      statusBreakdown: stats[0].byStatus,
      vehicleTypeBreakdown: stats[0].byVehicleType
    };

    res.json(result);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/vehicles/grain-entry
// @desc    Register vehicle entry with grain details
// @access  Private (Owner/Worker)
router.post('/grain-entry', [auth, authorize('owner', 'worker')], [
  body('vehicleNumber').trim().notEmpty().withMessage('Vehicle number is required'),
  body('vehicleType').isIn(['truck', 'mini-truck', 'tractor', 'trailer']).withMessage('Invalid vehicle type'),
  body('driverName').trim().notEmpty().withMessage('Driver name is required'),
  body('driverPhone').trim().notEmpty().withMessage('Driver phone is required')
    .custom((value) => {
      // If Indian number (+91), validate it starts with 6-9 and has 10 digits after country code
      if (value.startsWith('+91')) {
        const phoneNumber = value.substring(3);
        if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
          throw new Error('Indian phone number must be 10 digits and start with 6, 7, 8, or 9');
        }
      }
      return true;
    }),
  body('grainDetails.grainType').isIn(['rice', 'wheat', 'maize', 'barley', 'millet', 'sorghum']).withMessage('Invalid grain type'),
  body('grainDetails.actualBags').isInt({ min: 1 }).withMessage('Number of bags must be at least 1'),
  body('grainDetails.purpose').isIn(['storage', 'delivery', 'pickup', 'processing']).withMessage('Invalid purpose'),
  body('destination.customerName').trim().notEmpty().withMessage('Customer name is required'),
  body('destination.customerEmail').trim().notEmpty().withMessage('Customer email is required')
    .isEmail().withMessage('Please enter a valid email address'),
  body('destination.customerPhone').trim().notEmpty().withMessage('Customer phone is required')
    .custom((value) => {
      if (value.startsWith('+91')) {
        const phoneNumber = value.substring(3);
        if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
          throw new Error('Indian phone number must be 10 digits and start with 6, 7, 8, or 9');
        }
      }
      return true;
    })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: errors.array().map(e => e.msg).join('. '),
        errors: errors.array() 
      });
    }

    const vehicleData = {
      ...req.body,
      vehicleNumber: req.body.vehicleNumber.toUpperCase(),
      status: 'inside',
      entryTime: new Date(),
      entryBy: req.user.id
    };

    // Check if vehicle already inside
    const existingVehicle = await Vehicle.findOne({
      vehicleNumber: vehicleData.vehicleNumber,
      status: 'inside'
    });

    if (existingVehicle) {
      return res.status(400).json({
        message: 'Vehicle is already inside the warehouse'
      });
    }

    const vehicle = new Vehicle(vehicleData);
    await vehicle.save();

    // If purpose is storage, create or link customer account
    let customerId = req.user.id;
    if (req.body.grainDetails.purpose === 'storage') {
      const { customerName, customerEmail, customerPhone } = req.body.destination;
      
      // Check if customer exists by email or phone
      let customer = await User.findOne({
        $or: [
          { email: customerEmail.toLowerCase() },
          { 'profile.phone': customerPhone }
        ],
        role: 'customer'
      });

      if (!customer) {
        // Create new customer account
        const nameParts = customerName.trim().split(' ');
        const username = customerEmail.split('@')[0] + Math.random().toString(36).substr(2, 4);
        
        customer = new User({
          username,
          email: customerEmail.toLowerCase(),
          password: Math.random().toString(36).slice(-8) + 'A1!', // Random temp password
          role: 'customer',
          profile: {
            firstName: nameParts[0] || customerName,
            lastName: nameParts.slice(1).join(' ') || '',
            phone: customerPhone
          },
          isActive: true,
          needsPasswordChange: true
        });
        await customer.save();
        
        // Note: In production, send email with login credentials
      }
      
      customerId = customer._id;
      
      // Link customer to vehicle
      vehicle.customerId = customerId;
      await vehicle.save();
    }

    // Create transaction record for weighbridge fee
    const transactionId = `WB-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const transaction = new Transaction({
      transactionId,
      type: 'weighbridge_fee',
      customer: customerId,
      vehicle: vehicle._id,
      weighbridgeDetails: {
        vehicleNumber: vehicle.vehicleNumber,
        driverName: vehicle.driverName,
        weighingFee: 100
      },
      amount: {
        baseAmount: 100,
        totalAmount: 100
      },
      payment: {
        method: 'cash',
        status: 'pending'
      }
    });
    await transaction.save();

    res.status(201).json({
      message: 'Vehicle entry registered successfully',
      vehicle,
      transaction
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/vehicles/grain-exit
// @desc    Register vehicle exit with grain tracking
// @access  Private (Owner/Worker)
router.post('/grain-exit', [auth, authorize('owner', 'worker')], [
  body('vehicleId').notEmpty(),
  body('exitWeight').optional().isNumeric(),
  body('actualBags').optional().isNumeric(),
  body('paymentStatus').isIn(['pending', 'paid', 'partial'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { vehicleId, exitWeight, actualBags, remarks, paymentStatus } = req.body;

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle || vehicle.status !== 'inside') {
      return res.status(404).json({
        message: 'Vehicle not found or not currently inside'
      });
    }

    // Update vehicle with exit details
    vehicle.status = 'exited';
    vehicle.exitTime = new Date();
    vehicle.exitBy = req.user.id;
    vehicle.exitDetails = {
      exitWeight: exitWeight || vehicle.grainDetails?.totalWeight,
      actualBags: actualBags || vehicle.grainDetails?.actualBags,
      remarks,
      paymentStatus
    };

    await vehicle.save();

    // Update transaction payment status
    await Transaction.findOneAndUpdate(
      { vehicleId: vehicle._id, type: 'weighbridge_fee' },
      { 
        paymentMethod: paymentStatus === 'paid' ? 'cash' : 'pending',
        status: paymentStatus === 'paid' ? 'completed' : 'pending',
        paidAt: paymentStatus === 'paid' ? new Date() : null
      }
    );

    res.json({
      message: 'Vehicle exit registered successfully',
      vehicle
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;