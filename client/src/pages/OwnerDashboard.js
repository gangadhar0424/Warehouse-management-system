import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Fab,
  Chip,
  Divider,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Add,
  Warehouse,
  People,
  LocalShipping,
  AttachMoney,
  Analytics,
  GridView,
  PersonAdd,
  Assignment,
  Download,
  Edit,
  Delete,
  Visibility,
  Home,
  Inventory
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import axios from 'axios';

// Import new dashboard components
import CombinedAnalytics from '../components/CombinedAnalytics';
import LoanPortfolioManager from '../components/LoanPortfolioManager';
import AlertsCenter from '../components/AlertsCenter';
import DynamicWarehouseLayoutManager from '../components/DynamicWarehouseLayoutManager';
import UserManagementPanel from '../components/UserManagementPanel';
import VehicleManagement from './VehicleManagement';
import PredictionsTab from '../components/PredictionsTab';

const OwnerDashboard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data states
  const [stats, setStats] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  // Dialog states
  const [customerDialog, setCustomerDialog] = useState(false);
  const [workerDialog, setWorkerDialog] = useState(false);
  const [allocationDialog, setAllocationDialog] = useState(false);
  
  // Editing states
  const [editingWorker, setEditingWorker] = useState(null);

  // Form states
  const [customerForm, setCustomerForm] = useState({
    username: '',
    email: '',
    password: ''
  });

  const [workerForm, setWorkerForm] = useState({
    username: '',
    email: '',
    password: '',
    profile: {
      firstName: '',
      lastName: '',
      phone: ''
    }
  });

  const [allocationForm, setAllocationForm] = useState({
    customerId: '',
    warehouseId: '',
    allocation: {
      building: 1,
      block: 1,
      wing: 'left',
      box: 1
    },
    storageDetails: {
      type: 'dry',
      totalWeight: 0,
      totalVolume: 0
    },
    duration: {
      endDate: ''
    },
    pricing: {
      baseRate: 100,
      ratePerDay: 50
    }
  });

  const { user } = useAuth();
  const { addNotification } = useSocket();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [
        vehicleStatsRes,
        customersRes,
        workersRes,
        vehiclesRes
      ] = await Promise.all([
        axios.get('/api/vehicles/stats/dashboard'),
        axios.get('/api/customers'),
        axios.get('/api/workers'),
        axios.get('/api/vehicles')
      ]);

      setStats(vehicleStatsRes.data);
      setCustomers(customersRes.data.customers);
      setWorkers(workersRes.data.workers);
      setVehicles(vehiclesRes.data.vehicles);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };



  const handleAddWorker = async () => {
    try {
      await axios.post('/api/workers', workerForm);
      
      setSuccess('Worker added successfully!');
      setWorkerDialog(false);
      setWorkerForm({
        username: '', email: '', password: '',
        profile: { firstName: '', lastName: '', phone: '' }
      });
      
      fetchDashboardData();
      addNotification({
        type: 'success',
        title: 'Worker Added',
        message: `Worker "${workerForm.profile.firstName}" added successfully`,
        timestamp: new Date()
      });
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to add worker');
    }
  };

  const handleAllocateStorage = async () => {
    try {
      await axios.post('/api/warehouse/allocate', allocationForm);
      
      setSuccess('Storage allocated successfully!');
      setAllocationDialog(false);
      fetchDashboardData();
      
      addNotification({
        type: 'success',
        title: 'Storage Allocated',
        message: 'Storage space allocated to customer',
        timestamp: new Date()
      });
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to allocate storage');
    }
  };

  const handleExportData = async (type) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/exports/${type}`);
      
      if (response.data.success) {
        // Create download link for the generated Excel file
        const link = document.createElement('a');
        link.href = response.data.url;
        link.setAttribute('download', response.data.filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        setSuccess(`${type.replace('-', ' ')} exported successfully! (${response.data.recordCount} records)`);
      } else {
        setError('Failed to export data');
      }
    } catch (error) {
      console.error('Export error:', error);
      setError(error.response?.data?.message || 'Failed to export data');
    } finally {
      setLoading(false);
    }
  };



  const handleViewCustomer = (customerId) => {
    // Navigate to customer detail view or show detailed modal
    window.open(`/customer-profile/${customerId}`, '_blank');
  };

  const handleEditWorker = (worker) => {
    setWorkerForm({
      username: worker.username,
      email: worker.email,
      password: '', // Don't pre-fill password for security
      profile: {
        firstName: worker.profile.firstName,
        lastName: worker.profile.lastName,
        phone: worker.profile.phone
      }
    });
    setEditingWorker(worker._id);
    setWorkerDialog(true);
  };

  const handleDeleteWorker = async (workerId) => {
    if (window.confirm('Are you sure you want to delete this worker?')) {
      try {
        await axios.delete(`/api/workers/${workerId}`);
        setSuccess('Worker deleted successfully!');
        fetchDashboardData();
        addNotification({
          type: 'success',
          title: 'Worker Deleted',
          message: 'Worker has been removed from the system',
          timestamp: new Date()
        });
      } catch (error) {
        setError(error.response?.data?.message || 'Failed to delete worker');
      }
    }
  };

  const handleComprehensiveReport = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/exports/comprehensive-report');
      
      if (response.data.success) {
        const link = document.createElement('a');
        link.href = response.data.url;
        link.setAttribute('download', response.data.filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        setSuccess(`Comprehensive report exported successfully! (${response.data.totalRecords} total records)`);
      }
    } catch (error) {
      setError('Failed to export comprehensive report');
    } finally {
      setLoading(false);
    }
  };

  const handleDailyReport = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const response = await axios.get(`/api/exports/daily-report?date=${today}`);
      
      if (response.data.success) {
        const link = document.createElement('a');
        link.href = response.data.url;
        link.setAttribute('download', response.data.filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        setSuccess(`Daily report exported successfully!`);
      }
    } catch (error) {
      setError('Failed to export daily report');
    } finally {
      setLoading(false);
    }
  };

  const StatsCards = () => (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <LocalShipping color="primary" sx={{ fontSize: 40, mr: 2 }} />
              <Box>
                <Typography color="text.secondary" gutterBottom>
                  Total Vehicles
                </Typography>
                <Typography variant="h4">
                  {stats?.totalVehicles || 0}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Warehouse color="warning" sx={{ fontSize: 40, mr: 2 }} />
              <Box>
                <Typography color="text.secondary" gutterBottom>
                  Currently Inside
                </Typography>
                <Typography variant="h4">
                  {stats?.currentlyInside || 0}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <People color="info" sx={{ fontSize: 40, mr: 2 }} />
              <Box>
                <Typography color="text.secondary" gutterBottom>
                  Total Customers
                </Typography>
                <Typography variant="h4">
                  {customers?.length || 0}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <AttachMoney color="success" sx={{ fontSize: 40, mr: 2 }} />
              <Box>
                <Typography color="text.secondary" gutterBottom>
                  Today's Entries
                </Typography>
                <Typography variant="h4">
                  {stats?.todayEntries || 0}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );





  const WarehouseTransactions = () => {
    const [transactions, setTransactions] = useState([]);
    const [transactionFilter, setTransactionFilter] = useState('all');
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);

    useEffect(() => {
      fetchTransactions();
    }, [transactionFilter]);

    const handleViewTransaction = (transaction) => {
      setSelectedTransaction(transaction);
      setViewDialogOpen(true);
    };

    const handleCloseDialog = () => {
      setViewDialogOpen(false);
      setSelectedTransaction(null);
    };

    const formatDateTime = (date) => {
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    };

    const fetchTransactions = async () => {
      try {
        const params = new URLSearchParams();
        if (transactionFilter !== 'all') params.append('type', transactionFilter);
        
        const response = await axios.get(`/api/transactions?${params}`);
        setTransactions(response.data.transactions || []);
      } catch (error) {
        console.error('Error fetching transactions:', error);
        setTransactions([]); // Set empty array as fallback
      }
    };

    const getTransactionIcon = (type) => {
      switch (type) {
        case 'weighbridge_fee': return <Scale />;
        case 'loan_repayment': return <MonetizationOn />;
        case 'grain_storage_rent': return <Home />;
        case 'grain_loan': return <MonetizationOn />;
        case 'grain_release': return <Inventory />;
        default: return <AttachMoney />;
      }
    };

    const getTransactionColor = (type) => {
      switch (type) {
        case 'weighbridge_fee': return 'primary';
        case 'loan_repayment': return 'success';
        case 'grain_storage_rent': return 'warning';
        case 'grain_loan': return 'info';
        case 'grain_release': return 'secondary';
        default: return 'default';
      }
    };

    return (
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
            <AttachMoney sx={{ mr: 1 }} />
            Warehouse Transactions
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Filter</InputLabel>
              <Select
                value={transactionFilter}
                onChange={(e) => setTransactionFilter(e.target.value)}
                label="Filter"
              >
                <MenuItem value="all">All Transactions</MenuItem>
                <MenuItem value="weighbridge_fee">Weighbridge Fees</MenuItem>
                <MenuItem value="loan_repayment">Loan Repayments</MenuItem>
                <MenuItem value="grain_storage_rent">Storage Rent</MenuItem>
                <MenuItem value="grain_loan">Grain Loans</MenuItem>
                <MenuItem value="grain_release">Grain Release</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => handleExportData('transactions')}
            >
              Export
            </Button>
          </Box>
        </Box>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="primary">
                  ₹{transactions.reduce((sum, t) => sum + (t.amount?.totalAmount || t.amount?.baseAmount || t.amount || 0), 0).toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Revenue Today
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="success.main">
                  {transactions.filter(t => t.type === 'weighbridge_fee').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Weighbridge Transactions
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="warning.main">
                  {transactions.filter(t => t.type === 'loan_repayment').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Loan Repayments
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="info.main">
                  {transactions.filter(t => t.type === 'grain_storage_rent').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Storage Rent Payments
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction._id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Chip
                        icon={getTransactionIcon(transaction.type)}
                        label={transaction.type?.replace('_', ' ').toUpperCase()}
                        color={getTransactionColor(transaction.type)}
                        size="small"
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {transaction.customer?.profile?.firstName} {transaction.customer?.profile?.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {transaction.customer?.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold" color="success.main">
                      ₹{(transaction.amount?.totalAmount || transaction.amount?.baseAmount || transaction.amount || 0).toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDateTime(transaction.createdAt || transaction.payment?.date)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={(transaction.payment?.status || transaction.status || 'pending').toUpperCase()}
                      color={(transaction.payment?.status || transaction.status) === 'completed' ? 'success' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Button 
                      size="small" 
                      startIcon={<Visibility />}
                      onClick={() => handleViewTransaction(transaction)}
                      variant="outlined"
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {transactions.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <AttachMoney sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No transactions found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Transactions will appear here as customers make payments
            </Typography>
          </Box>
        )}

        {/* Transaction Details Dialog */}
        <Dialog open={viewDialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6">Transaction Details</Typography>
              {selectedTransaction && selectedTransaction.type && (
                <Chip
                  icon={getTransactionIcon(selectedTransaction.type)}
                  label={selectedTransaction.type.replace(/_/g, ' ').toUpperCase()}
                  color={getTransactionColor(selectedTransaction.type)}
                />
              )}
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            {selectedTransaction && (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                    <Typography variant="caption" color="text.secondary">Transaction ID</Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {selectedTransaction.transactionId || selectedTransaction._id}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                    <Typography variant="caption" color="text.secondary">Date & Time</Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {formatDateTime(selectedTransaction.createdAt || selectedTransaction.payment?.date)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                    <Typography variant="caption" color="text.secondary">Customer</Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {selectedTransaction.customer?.profile?.firstName} {selectedTransaction.customer?.profile?.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {selectedTransaction.customer?.email}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                    <Typography variant="caption" color="text.secondary">Status</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip
                        label={(selectedTransaction.payment?.status || selectedTransaction.status || 'pending').toUpperCase()}
                        color={(selectedTransaction.payment?.status || selectedTransaction.status) === 'completed' ? 'success' : 'warning'}
                        size="small"
                      />
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, backgroundColor: 'success.50' }}>
                    <Typography variant="caption" color="text.secondary">Base Amount</Typography>
                    <Typography variant="h6" color="success.main" fontWeight="bold">
                      ₹{(selectedTransaction.amount?.baseAmount || selectedTransaction.amount || 0).toLocaleString()}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, backgroundColor: 'primary.50' }}>
                    <Typography variant="caption" color="text.secondary">Total Amount</Typography>
                    <Typography variant="h6" color="primary.main" fontWeight="bold">
                      ₹{(selectedTransaction.amount?.totalAmount || selectedTransaction.amount?.baseAmount || selectedTransaction.amount || 0).toLocaleString()}
                    </Typography>
                  </Paper>
                </Grid>
                {selectedTransaction.payment?.method && (
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                      <Typography variant="caption" color="text.secondary">Payment Method</Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {selectedTransaction.payment.method.toUpperCase()}
                      </Typography>
                    </Paper>
                  </Grid>
                )}
                {selectedTransaction.payment?.reference && (
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                      <Typography variant="caption" color="text.secondary">Payment Reference</Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {selectedTransaction.payment.reference}
                      </Typography>
                    </Paper>
                  </Grid>
                )}
                {selectedTransaction.metadata?.notes && (
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                      <Typography variant="caption" color="text.secondary">Notes</Typography>
                      <Typography variant="body2">
                        {selectedTransaction.metadata.notes}
                      </Typography>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Close</Button>
          </DialogActions>
        </Dialog>
      </Paper>
    );
  };

  const ReportsAnalytics = () => (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Reports & Analytics
      </Typography>
      
      <Grid container spacing={3}>
        {/* Quick Export Section */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2, mb: 2 }}>
            📊 Quick Data Exports
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Download />}
                onClick={() => handleExportData('transactions')}
                disabled={loading}
              >
                Export Transactions
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Download />}
                onClick={() => handleExportData('customers')}
                disabled={loading}
              >
                Export Customers
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Download />}
                onClick={() => handleExportData('vehicles')}
                disabled={loading}
              >
                Export Vehicles
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Download />}
                onClick={() => handleExportData('storage-allocations')}
                disabled={loading}
              >
                Export Storage
              </Button>
            </Grid>
          </Grid>
        </Grid>

        {/* Special Reports Section */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 3, mb: 2 }}>
            📈 Special Reports
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <Button
                fullWidth
                variant="outlined"
                color="primary"
                startIcon={<Analytics />}
                onClick={handleDailyReport}
                disabled={loading}
              >
                Today's Report
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Button
                fullWidth
                variant="outlined"
                color="secondary"
                startIcon={<Analytics />}
                onClick={handleComprehensiveReport}
                disabled={loading}
              >
                Comprehensive Report
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Button
                fullWidth
                variant="outlined"
                color="info"
                startIcon={<Download />}
                onClick={() => {
                  const startDate = new Date();
                  startDate.setDate(startDate.getDate() - 7);
                  const endDate = new Date();
                  const start = startDate.toISOString().split('T')[0];
                  const end = endDate.toISOString().split('T')[0];
                  handleExportData(`transactions?startDate=${start}&endDate=${end}`);
                }}
                disabled={loading}
              >
                Weekly Report
              </Button>
            </Grid>
          </Grid>
        </Grid>

        {/* Analytics Cards */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 3, mb: 2 }}>
            📊 Analytics Overview
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <LocalShipping color="primary" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h6" color="primary">
                    {stats?.totalVehicles || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Vehicles
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <People color="success" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h6" color="success.main">
                    {customers?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Customers
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <AttachMoney color="info" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h6" color="info.main">
                    ₹{stats?.totalRevenue || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Revenue
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* File Management */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 3, mb: 2 }}>
            📁 File Management
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            All files are stored locally in the ./uploads directory. Export files are automatically cleaned after 24 hours.
          </Alert>
          <Button
            variant="text"
            color="warning"
            onClick={() => {
              axios.delete('/api/exports/cleanup')
                .then(() => setSuccess('Old export files cleaned successfully'))
                .catch(() => setError('Failed to clean export files'));
            }}
          >
            🗑️ Clean Old Export Files
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Owner Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <StatsCards />

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} variant="scrollable" scrollButtons="auto">
          <Tab label="Warehouse Layout Manager" />
          <Tab label="User Management" />
          <Tab label="Vehicle Management" />
          <Tab label="Transactions" />
          <Tab label="Analytics" />
          <Tab label="Predictions" />
          <Tab label="Loan Portfolio" />
          <Tab label="Alerts Center" />
        </Tabs>
      </Box>

      {activeTab === 0 && <DynamicWarehouseLayoutManager />}
      {activeTab === 1 && <UserManagementPanel />}
      {activeTab === 2 && <VehicleManagement />}
      {activeTab === 3 && <WarehouseTransactions />}
      {activeTab === 4 && <CombinedAnalytics />}
      {activeTab === 5 && <PredictionsTab />}
      {activeTab === 6 && <LoanPortfolioManager />}
      {activeTab === 7 && <AlertsCenter />}

      {/* Worker Addition Dialog */}
      <Dialog open={workerDialog} onClose={() => setWorkerDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Worker</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="First Name"
                value={workerForm.profile.firstName}
                onChange={(e) => setWorkerForm(prev => ({
                  ...prev,
                  profile: { ...prev.profile, firstName: e.target.value }
                }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={workerForm.profile.lastName}
                onChange={(e) => setWorkerForm(prev => ({
                  ...prev,
                  profile: { ...prev.profile, lastName: e.target.value }
                }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Username"
                value={workerForm.username}
                onChange={(e) => setWorkerForm(prev => ({ ...prev, username: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="email"
                label="Email"
                value={workerForm.email}
                onChange={(e) => setWorkerForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Phone"
                value={workerForm.profile.phone}
                onChange={(e) => setWorkerForm(prev => ({
                  ...prev,
                  profile: { ...prev.profile, phone: e.target.value }
                }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="password"
                label="Password"
                value={workerForm.password}
                onChange={(e) => setWorkerForm(prev => ({ ...prev, password: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWorkerDialog(false)}>Cancel</Button>
          <Button onClick={handleAddWorker} variant="contained">
            Add Worker
          </Button>
        </DialogActions>
      </Dialog>

      {/* Storage Allocation Dialog */}
      <Dialog open={allocationDialog} onClose={() => setAllocationDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Allocate Storage Space</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Customer</InputLabel>
                <Select
                  value={allocationForm.customerId}
                  label="Customer"
                  onChange={(e) => setAllocationForm(prev => ({ ...prev, customerId: e.target.value }))}
                >
                  {customers.map((customer) => (
                    <MenuItem key={customer._id} value={customer._id}>
                      {customer.profile?.firstName} {customer.profile?.lastName} (@{customer.username})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="Building"
                value={allocationForm.allocation.building}
                onChange={(e) => setAllocationForm(prev => ({
                  ...prev,
                  allocation: { ...prev.allocation, building: parseInt(e.target.value) }
                }))}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="Block"
                value={allocationForm.allocation.block}
                onChange={(e) => setAllocationForm(prev => ({
                  ...prev,
                  allocation: { ...prev.allocation, block: parseInt(e.target.value) }
                }))}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Wing</InputLabel>
                <Select
                  value={allocationForm.allocation.wing}
                  label="Wing"
                  onChange={(e) => setAllocationForm(prev => ({
                    ...prev,
                    allocation: { ...prev.allocation, wing: e.target.value }
                  }))}
                >
                  <MenuItem value="left">Left</MenuItem>
                  <MenuItem value="right">Right</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="Box"
                value={allocationForm.allocation.box}
                onChange={(e) => setAllocationForm(prev => ({
                  ...prev,
                  allocation: { ...prev.allocation, box: parseInt(e.target.value) }
                }))}
                inputProps={{ min: 1, max: 6 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="date"
                label="End Date"
                value={allocationForm.duration.endDate}
                onChange={(e) => setAllocationForm(prev => ({
                  ...prev,
                  duration: { ...prev.duration, endDate: e.target.value }
                }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAllocationDialog(false)}>Cancel</Button>
          <Button onClick={handleAllocateStorage} variant="contained">
            Allocate Storage
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default OwnerDashboard;