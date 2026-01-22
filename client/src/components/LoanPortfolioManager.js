import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  LinearProgress,
  Divider
} from '@mui/material';
import {
  Refresh,
  AccountBalance,
  CheckCircle,
  Cancel,
  Warning,
  Visibility,
  TrendingUp,
  AttachMoney,
  Calculate
} from '@mui/icons-material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';
import axios from 'axios';
import LoanCalculator from './LoanCalculator';

const COLORS = ['#4caf50', '#ff9800', '#f44336', '#2196f3'];

const LoanPortfolioManager = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loanData, setLoanData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [customerLoans, setCustomerLoans] = useState([]);

  const fetchLoanData = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem('token');
      
      // Fetch loan portfolio data
      const portfolioResponse = await axios.get('/api/analytics/owner/loan-portfolio', {
        headers: { 'x-auth-token': token }
      });
      
      // Fetch pending approvals
      const pendingResponse = await axios.get('/api/loans/pending-approvals', {
        headers: { 'x-auth-token': token }
      });

      // Fetch all customer loans with grain details
      const loansResponse = await axios.get('/api/loans/all-customer-loans', {
        headers: { 'x-auth-token': token }
      });
      
      setLoanData({
        ...portfolioResponse.data,
        pendingApprovals: pendingResponse.data.loans || []
      });
      setCustomerLoans(loansResponse.data.loans || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch loan data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLoanData();
  }, []);

  const handleRefresh = () => {
    fetchLoanData();
  };

  const handleApproveClick = (loan) => {
    setSelectedLoan(loan);
    setApprovalDialogOpen(true);
  };

  const handleApproveLoan = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `/api/loans/${selectedLoan._id}/approve`,
        { notes: approvalNotes },
        { headers: { 'x-auth-token': token } }
      );
      
      setApprovalDialogOpen(false);
      setSelectedLoan(null);
      setApprovalNotes('');
      fetchLoanData();
      
      // Show success message
      alert('Loan approved successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve loan');
    }
  };

  const handleRejectLoan = async (loanId) => {
    if (!window.confirm('Are you sure you want to reject this loan?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `/api/loans/${loanId}/reject`,
        {},
        { headers: { 'x-auth-token': token } }
      );
      
      fetchLoanData();
      alert('Loan rejected successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject loan');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!loanData) {
    return null;
  }

  const {
    totalIssued,
    activeLoans,
    completedLoans,
    defaultedLoans,
    totalAmount,
    activeAmount,
    interestEarned,
    pendingApprovals,
    loanToValueRatio,
    atRiskLoans,
    healthyLoans
  } = loanData;

  const portfolioBreakdown = [
    { name: 'Active', value: activeLoans, color: '#4caf50' },
    { name: 'Completed', value: completedLoans, color: '#2196f3' },
    { name: 'At Risk', value: atRiskLoans, color: '#ff9800' },
    { name: 'Defaulted', value: defaultedLoans, color: '#f44336' }
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AccountBalance sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" component="h1" fontWeight="bold">
            Loan Portfolio Management
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={handleRefresh} disabled={refreshing}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Alert for pending approvals */}
      {pendingApprovals?.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <strong>{pendingApprovals.length}</strong> loan application{pendingApprovals.length > 1 ? 's' : ''} pending your approval!
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <CardContent>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 1 }}>
                Total Loans Issued
              </Typography>
              <Typography variant="h3" fontWeight="bold" sx={{ color: '#fff', mb: 1 }}>
                {totalIssued}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                ₹{totalAmount?.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', backgroundColor: '#e8f5e9' }}>
            <CardContent>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                Active Loans
              </Typography>
              <Typography variant="h3" fontWeight="bold" sx={{ color: '#4caf50', mb: 1 }}>
                {activeLoans}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                ₹{activeAmount?.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', backgroundColor: '#e3f2fd' }}>
            <CardContent>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                Interest Earned
              </Typography>
              <Typography variant="h3" fontWeight="bold" sx={{ color: '#1976d2', mb: 1 }}>
                ₹{interestEarned?.toLocaleString()}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUp sx={{ fontSize: 18, color: '#4caf50' }} />
                <Typography variant="body2" color="textSecondary">
                  This month
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', backgroundColor: '#fff3e0' }}>
            <CardContent>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                Pending Approvals
              </Typography>
              <Typography variant="h3" fontWeight="bold" sx={{ color: '#ff9800', mb: 1 }}>
                {pendingApprovals?.length || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Requires attention
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label={`Pending Approvals (${pendingApprovals?.length || 0})`} />
          <Tab label="Customer Loans" />
          <Tab label="Loan Calculator" />
          <Tab label="Portfolio Analytics" />
        </Tabs>
      </Card>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Pending Loan Approvals
            </Typography>
            {pendingApprovals?.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Customer</TableCell>
                      <TableCell align="right">Loan Amount</TableCell>
                      <TableCell align="right">Interest Rate</TableCell>
                      <TableCell align="right">Duration</TableCell>
                      <TableCell>Collateral</TableCell>
                      <TableCell>Purpose</TableCell>
                      <TableCell align="right">Requested On</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingApprovals.map((loan) => (
                      <TableRow key={loan._id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {loan.customer?.profile?.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {loan.customer?.email}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body1" fontWeight="bold" color="primary">
                            ₹{loan.amount?.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{loan.interestRate}%</TableCell>
                        <TableCell align="right">{loan.duration} months</TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                            {loan.collateral}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                            {loan.purpose}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {new Date(loan.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="View Details">
                            <IconButton size="small">
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Approve">
                            <IconButton 
                              size="small" 
                              color="success"
                              onClick={() => handleApproveClick(loan)}
                            >
                              <CheckCircle />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reject">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleRejectLoan(loan._id)}
                            >
                              <Cancel />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info" sx={{ mt: 2 }}>
                No pending loan approvals at this time.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Customer Loans
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Loan Terms:</strong> Customers receive 60% loan on grain market value. 
                Calculation: Bags × 50kg ÷ 100 = Quintals. Quintals × Market value = Total grain value. 
                Eligible loan = Total grain value × 60%
              </Typography>
            </Alert>

            {customerLoans.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Customer</TableCell>
                      <TableCell align="right">Grain Bags</TableCell>
                      <TableCell align="right">Quintals</TableCell>
                      <TableCell align="right">Grain Value</TableCell>
                      <TableCell align="right">Loan Amount (60%)</TableCell>
                      <TableCell align="right">Outstanding</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {customerLoans.map((loan) => {
                      const bags = loan.grainDetails?.numberOfBags || 0;
                      const weightPerBag = loan.grainDetails?.bagWeight || 50;
                      const totalWeightKg = bags * weightPerBag;
                      const quintals = totalWeightKg / 100;
                      const marketValuePerQuintal = loan.grainDetails?.marketValue || 1500;
                      const totalGrainValue = quintals * marketValuePerQuintal;
                      const loanAmount = loan.amount || 0;
                      const outstanding = loan.remainingAmount || 0;

                      return (
                        <TableRow key={loan._id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">
                              {loan.customer?.profile?.firstName} {loan.customer?.profile?.lastName}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {loan.customer?.email}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">{bags.toLocaleString()}</TableCell>
                          <TableCell align="right">{quintals.toFixed(2)}</TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="primary">
                              ₹{totalGrainValue.toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body1" fontWeight="bold" color="success.main">
                              ₹{loanAmount.toLocaleString()}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              ({((loanAmount / totalGrainValue) * 100).toFixed(0)}% of value)
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color={outstanding > 0 ? 'error' : 'success.main'}>
                              ₹{outstanding.toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={loan.status}
                              size="small"
                              color={
                                loan.status === 'active' ? 'success' :
                                loan.status === 'completed' ? 'info' :
                                loan.status === 'pending' ? 'warning' : 'default'
                              }
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="View Details">
                              <IconButton size="small">
                                <Visibility />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">
                No customer loans found. Loans will appear here once customers request and you approve them.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 2 && <LoanCalculator />}

      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Loan Health Status
                </Typography>
                <Grid container spacing={2} sx={{ mt: 2 }}>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#e8f5e9' }}>
                      <CheckCircle sx={{ fontSize: 40, color: '#4caf50', mb: 1 }} />
                      <Typography variant="h4" fontWeight="bold" sx={{ color: '#4caf50' }}>
                        {healthyLoans}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Healthy Loans
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        On-time payments
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#fff3e0' }}>
                      <Warning sx={{ fontSize: 40, color: '#ff9800', mb: 1 }} />
                      <Typography variant="h4" fontWeight="bold" sx={{ color: '#ff9800' }}>
                        {atRiskLoans}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        At Risk Loans
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Overdue by &gt;7 days
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Loan-to-Value Ratio
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={loanToValueRatio * 100} 
                        sx={{ height: 10, borderRadius: 5 }}
                        color={loanToValueRatio > 0.65 ? 'warning' : 'primary'}
                      />
                    </Box>
                    <Typography variant="body1" fontWeight="bold">
                      {(loanToValueRatio * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                    Average loan amount vs grain collateral value
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Portfolio Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={portfolioBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {portfolioBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Loan Health Status
                </Typography>
                <Grid container spacing={2} sx={{ mt: 2 }}>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#e8f5e9' }}>
                      <CheckCircle sx={{ fontSize: 40, color: '#4caf50', mb: 1 }} />
                      <Typography variant="h4" fontWeight="bold" sx={{ color: '#4caf50' }}>
                        {healthyLoans}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Healthy Loans
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        On-time payments
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#fff3e0' }}>
                      <Warning sx={{ fontSize: 40, color: '#ff9800', mb: 1 }} />
                      <Typography variant="h4" fontWeight="bold" sx={{ color: '#ff9800' }}>
                        {atRiskLoans}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        At Risk Loans
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Overdue by &gt;7 days
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Loan-to-Value Ratio
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={loanToValueRatio * 100} 
                        sx={{ height: 10, borderRadius: 5 }}
                        color={loanToValueRatio > 0.65 ? 'warning' : 'primary'}
                      />
                    </Box>
                    <Typography variant="body1" fontWeight="bold">
                      {(loanToValueRatio * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                    Average loan amount vs grain collateral value
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Portfolio Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={portfolioBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {portfolioBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Loan Analytics & Insights
                </Typography>
                <Grid container spacing={3} sx={{ mt: 2 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Avg Loan Amount
                      </Typography>
                      <Typography variant="h5" fontWeight="bold" color="primary">
                        ₹{totalAmount && totalIssued ? (totalAmount / totalIssued).toFixed(0).toLocaleString() : 0}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Approval Rate
                      </Typography>
                      <Typography variant="h5" fontWeight="bold" sx={{ color: '#4caf50' }}>
                        {totalIssued ? ((activeLoans + completedLoans) / totalIssued * 100).toFixed(1) : 0}%
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Default Rate
                      </Typography>
                      <Typography variant="h5" fontWeight="bold" sx={{ color: '#f44336' }}>
                        {totalIssued ? (defaultedLoans / totalIssued * 100).toFixed(1) : 0}%
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Completion Rate
                      </Typography>
                      <Typography variant="h5" fontWeight="bold" sx={{ color: '#2196f3' }}>
                        {totalIssued ? (completedLoans / totalIssued * 100).toFixed(1) : 0}%
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Approval Dialog */}
      <Dialog open={approvalDialogOpen} onClose={() => setApprovalDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Approve Loan Application</DialogTitle>
        <DialogContent dividers>
          {selectedLoan && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Customer</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedLoan.customer?.profile?.name}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Loan Amount</Typography>
                  <Typography variant="body1" fontWeight="bold" color="primary">
                    ₹{selectedLoan.amount?.toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Interest Rate</Typography>
                  <Typography variant="body1">{selectedLoan.interestRate}%</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Duration</Typography>
                  <Typography variant="body1">{selectedLoan.duration} months</Typography>
                </Grid>
              </Grid>
              
              <TextField
                label="Approval Notes (Optional)"
                multiline
                rows={3}
                fullWidth
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Add any notes or conditions for this loan approval..."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleApproveLoan} 
            variant="contained" 
            color="success"
            startIcon={<CheckCircle />}
          >
            Approve Loan
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LoanPortfolioManager;
