const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  vehicleNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  vehicleType: {
    type: String,
    enum: ['truck', 'mini-truck', 'tractor', 'trailer', 'container', 'van', 'other'],
    required: true
  },
  driverName: {
    type: String,
    required: true,
    trim: true
  },
  driverPhone: {
    type: String,
    required: true
  },
  driverLicense: String,
  ownerName: {
    type: String,
    required: false
  },
  ownerPhone: String,
  capacity: {
    weight: Number, // in tons
    volume: Number  // in cubic meters
  },
  entryTime: {
    type: Date,
    default: Date.now
  },
  exitTime: Date,
  weighBridgeData: {
    grossWeight: Number,
    tareWeight: Number,
    netWeight: Number,
    weighBridgeOperator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  status: {
    type: String,
    enum: ['entered', 'loaded', 'weighed', 'exited', 'inside'],
    default: 'entered'
  },
  // New grain-specific fields
  grainDetails: {
    grainType: {
      type: String,
      enum: ['rice', 'wheat', 'maize', 'barley', 'millet', 'sorghum'],
      default: 'rice'
    },
    isIncoming: {
      type: Boolean,
      default: true
    },
    estimatedBags: Number,
    actualBags: Number,
    avgBagWeight: {
      type: Number,
      default: 50
    },
    totalWeight: Number,
    qualityGrade: {
      type: String,
      enum: ['A', 'B', 'C'],
      default: 'A'
    },
    purpose: {
      type: String,
      enum: ['storage', 'delivery', 'pickup', 'processing'],
      default: 'storage'
    }
  },
  destination: {
    warehouseSection: String,
    customerName: String,
    customerEmail: String,
    customerPhone: String
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  exitDetails: {
    exitWeight: Number,
    actualBags: Number,
    remarks: String,
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'partial'],
      default: 'pending'
    }
  },
  entryBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  exitBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cargo: {
    description: String,
    quantity: Number,
    unit: String
  },
  documents: [{
    name: String,
    url: String,
    uploadDate: Date
  }],
  charges: {
    weighBridgeCharge: Number,
    storageCharge: Number,
    loadingCharge: Number,
    otherCharges: Number,
    total: Number
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Calculate total charges before saving
vehicleSchema.pre('save', function(next) {
  if (this.charges) {
    this.charges.total = (this.charges.weighBridgeCharge || 0) + 
                        (this.charges.storageCharge || 0) + 
                        (this.charges.loadingCharge || 0) + 
                        (this.charges.otherCharges || 0);
  }
  next();
});

module.exports = mongoose.model('Vehicle', vehicleSchema);