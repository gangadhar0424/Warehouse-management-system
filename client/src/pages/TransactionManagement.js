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
  CurrencyRupee,
  Add,
  Visibility,
  Receipt,
  TrendingUp,
  TrendingDown,
  Payment,
  Scale,
  Schedule,
  Warning,
  Warehouse,
  FileDownload
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useTranslation } from '../i18n/LanguageContext';
import axios from 'axios';

const TransactionManagement = () => {
  const { t } = useTranslation();
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

  const handleExportTransactions = async () => {
    try {
      const params = {};
      if (activeTab === 1) params.status = 'pending';
      if (activeTab === 2) params.status = 'completed';
      if (activeTab === 3) params.today = true;

      const response = await axios.get('/api/exports/transactions', {
        params,
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'transactions.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting transactions:', error);
      setError('Failed to export transactions');
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
      loan_repayment: <Payment />
    };
    return typeIcons[type] || <CurrencyRupee />;
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
          💰 {t('transactions.title')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<FileDownload />}
            onClick={handleExportTransactions}
          >
            {t('common.export') || 'Export Excel'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateDialog(true)}
            disabled={user?.role !== 'owner'}
          >
            {t('transactions.newTransaction')}
          </Button>
        </Box>
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
                    {t('transactions.totalRevenue')}
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
                    {t('transactions.pendingPayments')}
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
                    {t('transactions.completedToday')}
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
                    {t('transactions.overdue')}
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
          <Tab label={`${t('transactions.allTransactions')} (${transactions.length})`} />
          <Tab label={`${t('transactions.filter')} (${transactions.filter(t => t.payment.status === 'pending').length})`} />
          <Tab label={`${t('common.completed')} (${transactions.filter(t => t.payment.status === 'completed').length})`} />
          <Tab label={t('transactions.todayTransactions')} />
        </Tabs>
      </Paper>

      {/* Transactions Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('transactions.transactionId')}</TableCell>
              <TableCell>{t('transactions.type')}</TableCell>
              <TableCell>{t('transactions.customer')}</TableCell>
              <TableCell>{t('transactions.amount')}</TableCell>
              <TableCell>{t('transactions.paymentMethod')}</TableCell>
              <TableCell>{t('transactions.status')}</TableCell>
              <TableCell>{t('transactions.date')}</TableCell>
              <TableCell>{t('common.actions')}</TableCell>
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
                  <Tooltip title={t('common.viewDetails')}>
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
                    <Tooltip title={t('transactions.markAsPaid')}>
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
        <DialogTitle>💰 {t('transactions.createNewTransaction')}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>{t('transactions.transactionType')}</InputLabel>
                <Select
                  value={newTransaction.type}
                  onChange={(e) => setNewTransaction(prev => ({...prev, type: e.target.value}))}
                >
                  <MenuItem value="weighbridge_fee">{t('transactions.weighbridgeFee')}</MenuItem>
                  <MenuItem value="grain_storage_rent">{t('transactions.grainStorageRent')}</MenuItem>
                  <MenuItem value="loan_repayment">{t('transactions.loanRepayment')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('transactions.customerId')}
                value={newTransaction.customer}
                onChange={(e) => setNewTransaction(prev => ({...prev, customer: e.target.value}))}
                placeholder="Customer MongoDB ObjectId"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('transactions.amountRupees')}
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
                <InputLabel>{t('transactions.paymentMethod')}</InputLabel>
                <Select
                  value={newTransaction.payment.method}
                  onChange={(e) => setNewTransaction(prev => ({
                    ...prev, 
                    payment: {...prev.payment, method: e.target.value}
                  }))}
                >
                  <MenuItem value="cash">{t('transactions.cash')}</MenuItem>
                  <MenuItem value="upi">{t('transactions.upi')}</MenuItem>
                  <MenuItem value="card">{t('transactions.card')}</MenuItem>
                  <MenuItem value="bank_transfer">{t('transactions.bankTransfer')}</MenuItem>
                  <MenuItem value="cheque">{t('transactions.cheque')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('transactions.description')}
                multiline
                rows={3}
                value={newTransaction.description}
                onChange={(e) => setNewTransaction(prev => ({...prev, description: e.target.value}))}
                placeholder={t('transactions.descriptionPlaceholder')}
              />
            </Grid>
            
            {/* Grain Details for relevant transaction types */}
            {(['grain_storage_rent'].includes(newTransaction.type)) && (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }}>
                    <Typography variant="subtitle2">🌾 {t('transactions.grainDetails')}</Typography>
                  </Divider>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>{t('transactions.grainType')}</InputLabel>
                    <Select
                      value={newTransaction.grainDetails.grainType}
                      onChange={(e) => setNewTransaction(prev => ({
                        ...prev, 
                        grainDetails: {...prev.grainDetails, grainType: e.target.value}
                      }))}
                    >
                      <MenuItem value="rice">{t('transactions.rice')}</MenuItem>
                      <MenuItem value="wheat">{t('transactions.wheat')}</MenuItem>
                      <MenuItem value="maize">{t('transactions.maize')}</MenuItem>
                      <MenuItem value="barley">{t('transactions.barley')}</MenuItem>
                      <MenuItem value="millet">{t('transactions.millet')}</MenuItem>
                      <MenuItem value="sorghum">{t('transactions.sorghum')}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label={t('transactions.numberOfBags')}
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
                    <InputLabel>{t('transactions.qualityGrade')}</InputLabel>
                    <Select
                      value={newTransaction.grainDetails.qualityGrade}
                      onChange={(e) => setNewTransaction(prev => ({
                        ...prev, 
                        grainDetails: {...prev.grainDetails, qualityGrade: e.target.value}
                      }))}
                    >
                      <MenuItem value="A">{t('transactions.gradeAPremium')}</MenuItem>
                      <MenuItem value="B">{t('transactions.gradeBStandard')}</MenuItem>
                      <MenuItem value="C">{t('transactions.gradeCBasic')}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>{t('common.cancel')}</Button>
          <Button 
            onClick={handleCreateTransaction} 
            variant="contained"
            disabled={!newTransaction.customer || !newTransaction.amount.baseAmount}
          >
            {t('transactions.createTransaction')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transaction Detail Dialog */}
      <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{t('transactions.transactionDetails')} - {selectedTransaction?.transactionId}</DialogTitle>
        <DialogContent>
          {selectedTransaction && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>{t('transactions.type')}</Typography>
                <Typography>{selectedTransaction.type.replace(/_/g, ' ').toUpperCase()}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>{t('transactions.amount')}</Typography>
                <Typography>{formatCurrency(selectedTransaction.amount.totalAmount)}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>{t('transactions.paymentMethod')}</Typography>
                <Typography>{selectedTransaction.payment.method.toUpperCase()}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>{t('transactions.status')}</Typography>
                {getStatusChip(selectedTransaction.payment.status)}
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>{t('transactions.description')}</Typography>
                <Typography>{selectedTransaction.description || t('transactions.noDescription')}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>{t('transactions.created')}</Typography>
                <Typography>{new Date(selectedTransaction.createdAt).toLocaleString()}</Typography>
              </Grid>
              {selectedTransaction.grainDetails && (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }}>
                      <Typography variant="subtitle2">🌾 {t('transactions.grainDetails')}</Typography>
                    </Divider>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="subtitle2" gutterBottom>{t('transactions.grainType')}</Typography>
                    <Typography>{selectedTransaction.grainDetails.grainType}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="subtitle2" gutterBottom>{t('transactions.bags')}</Typography>
                    <Typography>{selectedTransaction.grainDetails.numberOfBags || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="subtitle2" gutterBottom>{t('transactions.quality')}</Typography>
                    <Typography>{t('transactions.grade')} {selectedTransaction.grainDetails.qualityGrade}</Typography>
                  </Grid>
                </>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TransactionManagement;