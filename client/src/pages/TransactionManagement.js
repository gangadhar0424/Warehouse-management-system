import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Badge,
  Divider
} from '@mui/material';
import {
  AttachMoney,
  Add,
  Visibility,
  Receipt,
  TrendingUp,
  TrendingDown,
  Payment,
  AccountBalance,
  Scale,
  Grain,
  Schedule,
  Warning,
  Warehouse
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import axios from 'axios';

const TransactionManagement = () => {
  const { user } = useAuth();
  const { addNotification } = useSocket();
  const [activeTab, setActiveTab] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Statistics
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingPayments: 0,
    completedToday: 0,
    overdueCount: 0,
    typeBreakdown: {}
  });

  // Dialogs
  const [createDialog, setCreateDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // Form
  const [newTransaction, setNewTransaction] = useState({
    type: 'weighbridge_fee',
    customer: '',
    amount: {
      baseAmount: 100
    },
    payment: {
      method: 'cash'
    },
    description: '',
    grainDetails: {
      grainType: 'rice',
      numberOfBags: '',
      bagWeight: 50,
      qualityGrade: 'A'
    }
  });

  useEffect(() => {
    fetchTransactions();
    fetchStats();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/transactions');
      setTransactions(response.data.transactions || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/transactions/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleCreateTransaction = async () => {
    try {
      setError('');
      setLoading(true);

      const transactionData = {
        ...newTransaction,
        processedBy: user.id
      };

      const response = await axios.post('/api/transactions', transactionData);
      
      setSuccess('Transaction created successfully!');
      addNotification({
        type: 'success',
        title: 'Transaction Created',
        message: `Transaction ${response.data.transaction.transactionId} created`,
        timestamp: new Date()
      });

      setCreateDialog(false);
      setNewTransaction({
        type: 'weighbridge_fee',
        customer: '',
        amount: {
          baseAmount: 100
        },
        payment: {
          method: 'cash'
        },
        description: '',
        grainDetails: {
          grainType: 'rice',
          numberOfBags: '',
          bagWeight: 50,
          qualityGrade: 'A'
        }
      });
      
      fetchTransactions();
      fetchStats();
    } catch (error) {
      console.error('Error creating transaction:', error);
      setError(error.response?.data?.message || 'Failed to create transaction');
    } finally {
      setLoading(false);
    }
  };

  const updatePaymentStatus = async (transactionId, status) => {
    try {
      await axios.put(`/api/transactions/${transactionId}/payment-status`, { status });
      setSuccess('Payment status updated successfully!');
      fetchTransactions();
      fetchStats();
    } catch (error) {
      console.error('Error updating payment status:', error);
      setError('Failed to update payment status');
    }
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      pending: { color: 'warning', icon: <Schedule fontSize="small" /> },
      processing: { color: 'info', icon: <TrendingUp fontSize="small" /> },
      completed: { color: 'success', icon: <Receipt fontSize="small" /> },
      failed: { color: 'error', icon: <Warning fontSize="small" /> },
      refunded: { color: 'default', icon: <TrendingDown fontSize="small" /> }
    };
    
    const config = statusConfig[status] || { color: 'default', icon: null };
    
    return (
      <Chip
        label={status.toUpperCase()}
        color={config.color}
        size="small"
        icon={config.icon}
      />
    );
  };

  const getTypeIcon = (type) => {
    const typeIcons = {
      weighbridge_fee: <Scale />,
      grain_storage_rent: <Warehouse />,
      grain_loan: <AccountBalance />,
      loan_repayment: <Payment />,
      grain_release: <Grain />
    };
    return typeIcons[type] || <AttachMoney />;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const filterTransactions = () => {
    switch (activeTab) {
      case 0: return transactions; // All
      case 1: return transactions.filter(t => t.payment.status === 'pending');
      case 2: return transactions.filter(t => t.payment.status === 'completed');
      case 3: return transactions.filter(t => {
        const createdToday = new Date(t.createdAt).toDateString() === new Date().toDateString();
        return createdToday;
      });
      default: return transactions;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          💰 Transaction Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialog(true)}
          disabled={user?.role !== 'owner'}
        >
          New Transaction
        </Button>
      </Box>

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

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUp color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Revenue
                  </Typography>
                  <Typography variant="h4">
                    {formatCurrency(stats.totalRevenue)}
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
                <Warning color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Pending Payments
                  </Typography>
                  <Typography variant="h4">
                    {formatCurrency(stats.pendingPayments)}
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
                <Receipt color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Completed Today
                  </Typography>
                  <Typography variant="h4">
                    {stats.completedToday}
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
                <Schedule color="error" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Overdue
                  </Typography>
                  <Typography variant="h4">
                    <Badge badgeContent={stats.overdueCount} color="error">
                      <span>{stats.overdueCount}</span>
                    </Badge>
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label={`All Transactions (${transactions.length})`} />
          <Tab label={`Pending (${transactions.filter(t => t.payment.status === 'pending').length})`} />
          <Tab label={`Completed (${transactions.filter(t => t.payment.status === 'completed').length})`} />
          <Tab label="Today's Transactions" />
        </Tabs>
      </Paper>

      {/* Transactions Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Transaction ID</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Payment Method</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filterTransactions().map((transaction) => (
              <TableRow key={transaction._id}>
                <TableCell>
                  <Typography variant="subtitle2">
                    {transaction.transactionId}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {getTypeIcon(transaction.type)}
                    <Box sx={{ ml: 1 }}>
                      <Typography variant="body2">
                        {transaction.type.replace(/_/g, ' ').toUpperCase()}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  {transaction.customer?.profile?.firstName || transaction.customer?.username || 'N/A'}
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2">
                    {formatCurrency(transaction.amount.totalAmount)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={transaction.payment.method.toUpperCase()} 
                    size="small" 
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>{getStatusChip(transaction.payment.status)}</TableCell>
                <TableCell>
                  {new Date(transaction.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Tooltip title="View Details">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedTransaction(transaction);
                        setDetailDialog(true);
                      }}
                    >
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                  {transaction.payment.status === 'pending' && user?.role === 'owner' && (
                    <Tooltip title="Mark as Paid">
                      <IconButton
                        size="small"
                        onClick={() => updatePaymentStatus(transaction._id, 'completed')}
                        color="success"
                      >
                        <Receipt />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Transaction Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>💰 Create New Transaction</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Transaction Type</InputLabel>
                <Select
                  value={newTransaction.type}
                  onChange={(e) => setNewTransaction(prev => ({...prev, type: e.target.value}))}
                >
                  <MenuItem value="weighbridge_fee">Weighbridge Fee</MenuItem>
                  <MenuItem value="grain_storage_rent">Grain Storage Rent</MenuItem>
                  <MenuItem value="grain_loan">Grain Loan</MenuItem>
                  <MenuItem value="loan_repayment">Loan Repayment</MenuItem>
                  <MenuItem value="grain_release">Grain Release</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Customer ID"
                value={newTransaction.customer}
                onChange={(e) => setNewTransaction(prev => ({...prev, customer: e.target.value}))}
                placeholder="Customer MongoDB ObjectId"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Amount (₹)"
                type="number"
                value={newTransaction.amount.baseAmount}
                onChange={(e) => setNewTransaction(prev => ({
                  ...prev, 
                  amount: {...prev.amount, baseAmount: parseFloat(e.target.value) || 0}
                }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={newTransaction.payment.method}
                  onChange={(e) => setNewTransaction(prev => ({
                    ...prev, 
                    payment: {...prev.payment, method: e.target.value}
                  }))}
                >
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="upi">UPI</MenuItem>
                  <MenuItem value="card">Card</MenuItem>
                  <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                  <MenuItem value="cheque">Cheque</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={newTransaction.description}
                onChange={(e) => setNewTransaction(prev => ({...prev, description: e.target.value}))}
                placeholder="Transaction description..."
              />
            </Grid>
            
            {/* Grain Details for relevant transaction types */}
            {(['grain_storage_rent', 'grain_loan', 'grain_release'].includes(newTransaction.type)) && (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }}>
                    <Typography variant="subtitle2">🌾 Grain Details</Typography>
                  </Divider>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>Grain Type</InputLabel>
                    <Select
                      value={newTransaction.grainDetails.grainType}
                      onChange={(e) => setNewTransaction(prev => ({
                        ...prev, 
                        grainDetails: {...prev.grainDetails, grainType: e.target.value}
                      }))}
                    >
                      <MenuItem value="rice">Rice</MenuItem>
                      <MenuItem value="wheat">Wheat</MenuItem>
                      <MenuItem value="maize">Maize</MenuItem>
                      <MenuItem value="barley">Barley</MenuItem>
                      <MenuItem value="millet">Millet</MenuItem>
                      <MenuItem value="sorghum">Sorghum</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Number of Bags"
                    type="number"
                    value={newTransaction.grainDetails.numberOfBags}
                    onChange={(e) => setNewTransaction(prev => ({
                      ...prev, 
                      grainDetails: {...prev.grainDetails, numberOfBags: parseInt(e.target.value) || 0}
                    }))}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>Quality Grade</InputLabel>
                    <Select
                      value={newTransaction.grainDetails.qualityGrade}
                      onChange={(e) => setNewTransaction(prev => ({
                        ...prev, 
                        grainDetails: {...prev.grainDetails, qualityGrade: e.target.value}
                      }))}
                    >
                      <MenuItem value="A">Grade A (Premium)</MenuItem>
                      <MenuItem value="B">Grade B (Standard)</MenuItem>
                      <MenuItem value="C">Grade C (Basic)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateTransaction} 
            variant="contained"
            disabled={!newTransaction.customer || !newTransaction.amount.baseAmount}
          >
            Create Transaction
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transaction Detail Dialog */}
      <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Transaction Details - {selectedTransaction?.transactionId}</DialogTitle>
        <DialogContent>
          {selectedTransaction && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>Type</Typography>
                <Typography>{selectedTransaction.type.replace(/_/g, ' ').toUpperCase()}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>Amount</Typography>
                <Typography>{formatCurrency(selectedTransaction.amount.totalAmount)}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>Payment Method</Typography>
                <Typography>{selectedTransaction.payment.method.toUpperCase()}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>Status</Typography>
                {getStatusChip(selectedTransaction.payment.status)}
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>Description</Typography>
                <Typography>{selectedTransaction.description || 'No description'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>Created</Typography>
                <Typography>{new Date(selectedTransaction.createdAt).toLocaleString()}</Typography>
              </Grid>
              {selectedTransaction.grainDetails && (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }}>
                      <Typography variant="subtitle2">🌾 Grain Details</Typography>
                    </Divider>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="subtitle2" gutterBottom>Grain Type</Typography>
                    <Typography>{selectedTransaction.grainDetails.grainType}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="subtitle2" gutterBottom>Bags</Typography>
                    <Typography>{selectedTransaction.grainDetails.numberOfBags || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="subtitle2" gutterBottom>Quality</Typography>
                    <Typography>Grade {selectedTransaction.grainDetails.qualityGrade}</Typography>
                  </Grid>
                </>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TransactionManagement;