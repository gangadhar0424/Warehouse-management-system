const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Request = require('../models/Request');
const DynamicWarehouseLayout = require('../models/DynamicWarehouseLayout');
const Loan = require('../models/Loan');
const User = require('../models/User');

// Customer: Create a new request
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can create requests' });
    }

    const { type, message, allocationDetails, loanDetails } = req.body;

    const request = new Request({
      customer: req.user.userId,
      type,
      message,
      allocationDetails,
      loanDetails
    });

    await request.save();
    await request.populate('customer', 'name email phone');

    res.status(201).json(request);
  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({ message: 'Failed to create request', error: error.message });
  }
});

// Customer: Get my requests
router.get('/my-requests', auth, async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can view their requests' });
    }

    const requests = await Request.find({ customer: req.user.userId })
      .populate('processedBy', 'name')
      .populate('createdLoan')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ message: 'Failed to fetch requests', error: error.message });
  }
});

// Owner: Get all pending requests
router.get('/pending', auth, async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ message: 'Only owners can view requests' });
    }

    const requests = await Request.find({ status: 'pending' })
      .populate('customer', 'name email phone')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({ message: 'Failed to fetch requests', error: error.message });
  }
});

// Owner: Get all requests (with filter options)
router.get('/all', auth, async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ message: 'Only owners can view all requests' });
    }

    const { status, type } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    if (type) filter.type = type;

    const requests = await Request.find(filter)
      .populate('customer', 'name email phone')
      .populate('processedBy', 'name')
      .populate('createdLoan')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ message: 'Failed to fetch requests', error: error.message });
  }
});

// Owner: Approve/Reject request
router.put('/:requestId/process', auth, async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ message: 'Only owners can process requests' });
    }

    const { requestId } = req.params;
    const { action, rejectionReason, loanData } = req.body;

    const request = await Request.findById(requestId).populate('customer', 'name email phone');
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request already processed' });
    }

    if (action === 'approve') {
      request.status = 'approved';
      request.processedBy = req.user.userId;
      request.processedAt = new Date();

      // Handle vacate warehouse request
      if (request.type === 'vacate_warehouse') {
        const { building, block, slotLabel } = request.allocationDetails;
        
        // Find and deallocate the bags
        const layout = await DynamicWarehouseLayout.findOne({});
        
        if (layout) {
          for (let bldg of layout.buildings) {
            if (bldg.name === building) {
              for (let blk of bldg.blocks) {
                if (blk.name === block) {
                  for (let slot of blk.slots) {
                    if (slot.slotLabel === slotLabel && 
                        slot.customer && 
                        slot.customer.toString() === request.customer._id.toString()) {
                      
                      // Deallocate the slot
                      slot.status = 'available';
                      slot.customer = null;
                      slot.bags = 0;
                      slot.grainType = null;
                      slot.entryDate = null;
                      slot.weight = null;
                      
                      await layout.save();
                      break;
                    }
                  }
                }
              }
            }
          }
        }
      }

      // Handle loan approval request
      if (request.type === 'loan_approval' && loanData) {
        const loan = new Loan({
          customer: request.customer._id,
          amount: loanData.amount,
          interestRate: loanData.interestRate,
          duration: loanData.duration,
          purpose: request.loanDetails.purpose,
          collateral: request.loanDetails.collateral || loanData.collateral,
          status: 'active',
          disbursementDate: new Date(),
          repaymentDate: new Date(Date.now() + loanData.duration * 30 * 24 * 60 * 60 * 1000),
          monthlyEMI: loanData.monthlyEMI || (loanData.amount * (1 + loanData.interestRate / 100)) / loanData.duration,
          outstandingAmount: loanData.amount
        });

        await loan.save();
        request.createdLoan = loan._id;
      }

      await request.save();
      await request.populate('createdLoan');

      res.json({ 
        message: 'Request approved successfully', 
        request,
        loan: request.createdLoan 
      });
    } else if (action === 'reject') {
      request.status = 'rejected';
      request.rejectionReason = rejectionReason || 'No reason provided';
      request.processedBy = req.user.userId;
      request.processedAt = new Date();

      await request.save();

      res.json({ message: 'Request rejected', request });
    } else {
      res.status(400).json({ message: 'Invalid action' });
    }
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ message: 'Failed to process request', error: error.message });
  }
});

module.exports = router;
