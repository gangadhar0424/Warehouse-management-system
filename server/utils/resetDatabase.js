const mongoose = require('mongoose');
require('dotenv').config();

// Import all models
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Transaction = require('../models/Transaction');
const StorageAllocation = require('../models/StorageAllocation');
const Loan = require('../models/Loan');
const DynamicWarehouseLayout = require('../models/DynamicWarehouseLayout');
const WarehouseLayout = require('../models/WarehouseLayout');

const resetDatabase = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/warehouse_management';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    console.log('\n🚨 WARNING: This will DELETE ALL DATA from the database!');
    console.log('⏳ Starting database reset in 3 seconds...\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Delete all users (owners, customers, admins)
    const deletedUsers = await User.deleteMany({});
    console.log(`✅ Deleted ${deletedUsers.deletedCount} users (owners, customers, admins)`);

    // Delete all vehicles
    const deletedVehicles = await Vehicle.deleteMany({});
    console.log(`✅ Deleted ${deletedVehicles.deletedCount} vehicles`);

    // Delete all transactions
    const deletedTransactions = await Transaction.deleteMany({});
    console.log(`✅ Deleted ${deletedTransactions.deletedCount} transactions`);

    // Delete all storage allocations
    const deletedAllocations = await StorageAllocation.deleteMany({});
    console.log(`✅ Deleted ${deletedAllocations.deletedCount} storage allocations`);

    // Delete all loans
    const deletedLoans = await Loan.deleteMany({});
    console.log(`✅ Deleted ${deletedLoans.deletedCount} loans`);

    // Delete all dynamic warehouse layouts
    const deletedDynamicLayouts = await DynamicWarehouseLayout.deleteMany({});
    console.log(`✅ Deleted ${deletedDynamicLayouts.deletedCount} dynamic warehouse layouts`);

    // Delete all warehouse layouts
    const deletedLayouts = await WarehouseLayout.deleteMany({});
    console.log(`✅ Deleted ${deletedLayouts.deletedCount} warehouse layouts`);

    console.log('\n✨ Database reset completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - Users: ${deletedUsers.deletedCount}`);
    console.log(`   - Vehicles: ${deletedVehicles.deletedCount}`);
    console.log(`   - Transactions: ${deletedTransactions.deletedCount}`);
    console.log(`   - Storage Allocations: ${deletedAllocations.deletedCount}`);
    console.log(`   - Loans: ${deletedLoans.deletedCount}`);
    console.log(`   - Dynamic Layouts: ${deletedDynamicLayouts.deletedCount}`);
    console.log(`   - Warehouse Layouts: ${deletedLayouts.deletedCount}`);
    console.log('\n🎯 Database is now empty and ready for fresh data!\n');

  } catch (error) {
    console.error('❌ Error resetting database:', error.message);
    console.error(error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    process.exit(0);
  }
};

// Run the reset
resetDatabase();
