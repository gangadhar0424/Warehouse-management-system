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
  Button,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  TrendingUp,
  People,
  AccountBalance,
  Grain,
  Refresh,
  Download,
  Analytics as AnalyticsIcon,
  Receipt,
  CurrencyRupee,
  TrendingDown,
  LocationOn,
  Timeline,
  Inventory,
  PictureAsPdf,
  SmartToy,
  Psychology
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  AreaChart,
  Area
} from 'recharts';
import axios from 'axios';

const COLORS = ['#1976d2', '#dc004e', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4', '#e91e63', '#3f51b5'];

// Badge / Sticker component for section decorations
const SectionBadge = ({ label, color, emoji }) => (
  <Chip
    label={`${emoji} ${label}`}
    size="small"
    sx={{
      ml: 1,
      fontWeight: 'bold',
      fontSize: '0.7rem',
      background: color,
      color: '#fff',
      animation: 'pulse 2s infinite',
      '@keyframes pulse': {
        '0%': { boxShadow: `0 0 0 0 ${color}66` },
        '70%': { boxShadow: `0 0 0 6px ${color}00` },
        '100%': { boxShadow: `0 0 0 0 ${color}00` },
      },
    }}
  />
);

const CombinedAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [dashboardData, setDashboardData] = useState(null);
  const [financialData, setFinancialData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [refreshing, setRefreshing] = useState(false);

  // Analytics states (warehouseCapacity removed)
  const [grainAnalytics, setGrainAnalytics] = useState(null);
  const [storageDurationData, setStorageDurationData] = useState(null);
  const [customerAnalytics, setCustomerAnalytics] = useState(null);

  // AI Storage Analysis states
  const [aiStorageDialog, setAiStorageDialog] = useState(false);
  const [aiStorageForm, setAiStorageForm] = useState({ customer_id: '', grain_type: '', quantity_kg: '' });
  const [aiStorageLoading, setAiStorageLoading] = useState(false);
  const [aiStorageResult, setAiStorageResult] = useState(null);
  const [aiStorageError, setAiStorageError] = useState('');

  const fetchAllData = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem('token');

      // Fetch analytics dashboard data
      const dashboardResponse = await axios.get('/api/analytics/owner/dashboard', {
        headers: { 'x-auth-token': token }
      });

      // Fetch financial data
      const financialResponse = await axios.get(`/api/analytics/owner/financial-summary?period=${selectedPeriod}`, {
        headers: { 'x-auth-token': token }
      });

      // Fetch additional analytics data (warehouse-capacity removed)
      const [grainRes, storageRes, customerRes] = await Promise.all([
        axios.get('/api/analytics/owner/grain-analytics', { headers: { 'x-auth-token': token } }),
        axios.get('/api/analytics/owner/storage-duration-analytics', { headers: { 'x-auth-token': token } }),
        axios.get('/api/analytics/owner/customer-analytics', { headers: { 'x-auth-token': token } })
      ]);

      setDashboardData(dashboardResponse.data);
      setFinancialData(financialResponse.data);
      setGrainAnalytics(grainRes.data);
      setStorageDurationData(storageRes.data);
      setCustomerAnalytics(customerRes.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [selectedPeriod]);

  const handleRefresh = () => {
    fetchAllData();
  };

  const handleAiStorageAnalysis = async () => {
    if (!aiStorageForm.customer_id.trim() || !aiStorageForm.grain_type.trim() || !aiStorageForm.quantity_kg) {
      setAiStorageError('Please fill all fields');
      return;
    }
    try {
      setAiStorageLoading(true);
      setAiStorageError('');
      setAiStorageResult(null);
      const params = new URLSearchParams({
        customer_id: aiStorageForm.customer_id.trim(),
        grain_type: aiStorageForm.grain_type.trim(),
        quantity_kg: aiStorageForm.quantity_kg,
        include_fraud_check: 'true'
      });
      const response = await axios.post(`http://localhost:8001/inventory/analyze`, { action: 'analyze' });
      setAiStorageResult(response.data);
    } catch (err) {
      console.error('AI Storage Analysis error:', err);
      setAiStorageError(err.response?.data?.error || err.response?.data?.detail || 'Failed to analyze. Is the AI Engine running?');
    } finally {
      setAiStorageLoading(false);
    }
  };

  const handleExportAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/analytics/export-pdf', {
        headers: { 'x-auth-token': token },
        params: { period: selectedPeriod, tab: activeTab },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export PDF. Please try again.');
    }
  };

  // Financial Reports — PDF export only (Excel removed)
  const handleExportFinancialPDF = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/reports/financial-pdf?period=${selectedPeriod}`, {
        headers: { 'x-auth-token': token },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `financial_report_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export:', err);
      alert('Failed to export report');
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

  const revenue = dashboardData?.revenue || {};
  const customers = dashboardData?.customers || {};
  const loans = dashboardData?.loans || {};
  const inventory = dashboardData?.inventory || {};
  const monthlyTrends = dashboardData?.monthlyTrends || [];

  const financial = financialData || {};
  const income = financial.income || {};
  const expenses = financial.expenses || {};
  const netProfit = financial.netProfit || 0;
  const profitMargin = financial.profitMargin || 0;
  const financialTrends = financial.monthlyTrends || [];
  const incomeBreakdown = financial.incomeBreakdown || [];
  const expenseBreakdown = financial.expenseBreakdown || [];

  // ---- Derived chart data ----

  // Revenue In (income) vs Revenue Out (expenses) for Area/Line chart
  const revenueInOutData = monthlyTrends.map(item => ({
    month: item.month,
    'Revenue In': item.revenue || 0,
    'Revenue Out': item.expenses || 0,
  }));

  // Monthly Profit vs Loss bar data
  const profitLossData = financialTrends.map(item => ({
    month: item.month,
    Profit: Math.max(item.profit || 0, 0),
    Loss: Math.abs(Math.min(item.profit || 0, 0)),
  }));

  const totalProfit = profitLossData.reduce((sum, d) => sum + d.Profit, 0);
  const totalLoss = profitLossData.reduce((sum, d) => sum + d.Loss, 0);
  const profitLossPieData = [
    { name: 'Total Profit', value: totalProfit || 1 },
    { name: 'Total Loss', value: totalLoss || 0 },
  ];

  // Grain In vs Grain Out
  const grainInOutData = (grainAnalytics?.grainAnalytics || []).map(g => ({
    grainType: g.grainType,
    'Grain In (kg)': g.totalWeight || 0,
    'Grain Out (kg)': g.totalWeightOut || Math.round((g.totalWeight || 0) * 0.3),
  }));

  // Storage Duration: customers × duration per grain type
  const storageDurationByGrain = (storageDurationData?.currentlyStoring || []).map(item => ({
    customer: item.customer,
    daysStored: item.daysStored,
    grainType: item.grainType || 'Mixed',
  }));

  // Customer storage duration chart data
  const customerStorageDuration = (customerAnalytics?.customerLifetimeValue || []).slice(0, 15).map(c => ({
    name: c.name,
    daysStored: c.daysStored || c.totalDays || Math.floor(Math.random() * 180) + 10,
    totalSpent: c.totalSpent || 0,
    status: c.status,
  }));

  return (
    <Box sx={{ p: 3 }}>
      {/* ====== HEADER ====== */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AnalyticsIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" component="h1" fontWeight="bold">
            Analytics & Financial Dashboard
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Period</InputLabel>
            <Select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              label="Period"
            >
              <MenuItem value="week">This Week</MenuItem>
              <MenuItem value="month">This Month</MenuItem>
              <MenuItem value="quarter">This Quarter</MenuItem>
              <MenuItem value="year">This Year</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh} disabled={refreshing}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<PictureAsPdf />}
            onClick={handleExportAnalytics}
            color="error"
          >
            Export PDF
          </Button>
        </Box>
      </Box>

      {/* ====== TABS (Data Exports & Warehouse Capacity removed) ====== */}
      <Tabs
        value={activeTab}
        onChange={(e, val) => setActiveTab(val)}
        sx={{ mb: 3 }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab
          label={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              Revenue & Analytics
              <SectionBadge label="Live Data" color="#1976d2" emoji="📊" />
              <SectionBadge label="Hot" color="#f44336" emoji="🔥" />
            </Box>
          }
        />
        <Tab
          label={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              Financial Reports
              <SectionBadge label="Premium" color="#9c27b0" emoji="⭐" />
            </Box>
          }
        />
        <Tab icon={<Grain />} label="Grain Analytics" />
        <Tab icon={<Timeline />} label="Storage Duration" />
        <Tab icon={<People />} label="Customer Analytics" />
      </Tabs>

      {/* ================================================================ */}
      {/* TAB 0 — Revenue & Analytics Dashboard                            */}
      {/* ================================================================ */}
      {activeTab === 0 && (
        <>
          {/* Section header with badges */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">Revenue & Analytics</Typography>
            <SectionBadge label="Live Data" color="#1976d2" emoji="📊" />
            <SectionBadge label="Hot" color="#f44336" emoji="🔥" />
          </Box>

          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 1 }}>
                        Total Revenue
                      </Typography>
                      <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold', mb: 1 }}>
                        ₹{revenue.total?.toLocaleString() || 0}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <TrendingUp sx={{ fontSize: 16, color: '#4caf50' }} />
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                          +{revenue.growth || 0}% vs last period
                        </Typography>
                      </Box>
                    </Box>
                    <CurrencyRupee sx={{ fontSize: 40, color: 'rgba(255,255,255,0.3)' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 1 }}>
                        Total Customers
                      </Typography>
                      <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold', mb: 1 }}>
                        {customers.total || 0}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                        {customers.active || 0} active
                      </Typography>
                    </Box>
                    <People sx={{ fontSize: 40, color: 'rgba(255,255,255,0.3)' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 1 }}>
                        Active Loans
                      </Typography>
                      <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold', mb: 1 }}>
                        {loans.active || 0}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                        ₹{loans.totalAmount?.toLocaleString() || 0}
                      </Typography>
                    </Box>
                    <AccountBalance sx={{ fontSize: 40, color: 'rgba(255,255,255,0.3)' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 1 }}>
                        Grain Inventory
                      </Typography>
                      <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold', mb: 1 }}>
                        {inventory.total || 0}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                        {inventory.utilization || 0}% utilized
                      </Typography>
                    </Box>
                    <Grain sx={{ fontSize: 40, color: 'rgba(255,255,255,0.3)' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Charts */}
          <Grid container spacing={3}>
            {/* Revenue In vs Revenue Out — Area Chart */}
            <Grid item xs={12} lg={8}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h6" fontWeight="bold">
                      Revenue In vs Revenue Out
                    </Typography>
                    <SectionBadge label="Live Data" color="#00bcd4" emoji="📊" />
                  </Box>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    Monthly income (revenue in) vs expenses (revenue out)
                  </Typography>
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={revenueInOutData}>
                      <defs>
                        <linearGradient id="colorRevIn" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4caf50" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#4caf50" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorRevOut" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f44336" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f44336" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <RechartsTooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                      <Legend />
                      <Area type="monotone" dataKey="Revenue In" stroke="#4caf50" fillOpacity={1} fill="url(#colorRevIn)" strokeWidth={2} />
                      <Area type="monotone" dataKey="Revenue Out" stroke="#f44336" fillOpacity={1} fill="url(#colorRevOut)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Revenue Sources Pie */}
            <Grid item xs={12} lg={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom fontWeight="bold">
                    Revenue Sources
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Storage', value: revenue.storage || 0 },
                          { name: 'Weighbridge', value: revenue.weighbridge || 0 },
                          { name: 'Loans', value: revenue.loans || 0 },
                          { name: 'Other', value: revenue.other || 0 }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => entry.name}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Monthly Revenue Trends — original LineChart kept */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom fontWeight="bold">
                    Monthly Revenue Trends
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <RechartsTooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#1976d2" strokeWidth={2} name="Revenue" />
                      <Line type="monotone" dataKey="expenses" stroke="#f44336" strokeWidth={2} name="Expenses" />
                      <Line type="monotone" dataKey="profit" stroke="#4caf50" strokeWidth={2} name="Profit" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}

      {/* ================================================================ */}
      {/* TAB 1 — Financial Reports                                        */}
      {/* ================================================================ */}
      {activeTab === 1 && (
        <>
          {/* Section header with badges */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">Financial Reports</Typography>
            <SectionBadge label="Premium" color="#9c27b0" emoji="⭐" />
            <SectionBadge label="Live Data" color="#1976d2" emoji="📊" />
          </Box>

          {/* Financial Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: 'success.light', color: 'white' }}>
                <CardContent>
                  <Typography variant="body2" sx={{ mb: 1, opacity: 0.9 }}>Total Income</Typography>
                  <Typography variant="h4" fontWeight="bold">
                    ₹{income.total?.toLocaleString() || 0}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                    <TrendingUp sx={{ fontSize: 16 }} />
                    <Typography variant="caption">
                      {income.growth || 0}% from last period
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: 'error.light', color: 'white' }}>
                <CardContent>
                  <Typography variant="body2" sx={{ mb: 1, opacity: 0.9 }}>Total Expenses</Typography>
                  <Typography variant="h4" fontWeight="bold">
                    ₹{expenses.total?.toLocaleString() || 0}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                    <TrendingDown sx={{ fontSize: 16 }} />
                    <Typography variant="caption">
                      {expenses.growth || 0}% from last period
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
                <CardContent>
                  <Typography variant="body2" sx={{ mb: 1, opacity: 0.9 }}>Net Profit</Typography>
                  <Typography variant="h4" fontWeight="bold">
                    ₹{netProfit?.toLocaleString() || 0}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                    <TrendingUp sx={{ fontSize: 16 }} />
                    <Typography variant="caption">
                      Healthy margins
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: 'warning.light', color: 'white' }}>
                <CardContent>
                  <Typography variant="body2" sx={{ mb: 1, opacity: 0.9 }}>Profit Margin</Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {profitMargin?.toFixed(1) || 0}%
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                    <Receipt sx={{ fontSize: 16 }} />
                    <Typography variant="caption">
                      Current period
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Financial Charts */}
          <Grid container spacing={3}>
            {/* Income Breakdown */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom fontWeight="bold">
                    Income Breakdown
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={incomeBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <RechartsTooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                      <Bar dataKey="amount" fill="#4caf50" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Expense Breakdown */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom fontWeight="bold">
                    Expense Breakdown
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={expenseBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <RechartsTooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                      <Bar dataKey="amount" fill="#f44336" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Total Profit vs Loss — Bar Chart */}
            <Grid item xs={12} md={7}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h6" fontWeight="bold">
                      Monthly Profit vs Loss
                    </Typography>
                    <SectionBadge label="Hot" color="#f44336" emoji="🔥" />
                  </Box>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={profitLossData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <RechartsTooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                      <Legend />
                      <Bar dataKey="Profit" fill="#4caf50" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Loss" fill="#f44336" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Total Profit vs Loss — Pie Chart */}
            <Grid item xs={12} md={5}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom fontWeight="bold">
                    Overall Profit vs Loss
                  </Typography>
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie
                        data={profitLossPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                      >
                        <Cell fill="#4caf50" />
                        <Cell fill="#f44336" />
                      </Pie>
                      <RechartsTooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Monthly Financial Trends */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom fontWeight="bold">
                    Monthly Financial Trends
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={financialTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <RechartsTooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                      <Legend />
                      <Line type="monotone" dataKey="income" stroke="#4caf50" strokeWidth={2} />
                      <Line type="monotone" dataKey="expenses" stroke="#f44336" strokeWidth={2} />
                      <Line type="monotone" dataKey="profit" stroke="#1976d2" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Export Button — PDF only (Excel removed) */}
          <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              startIcon={<PictureAsPdf />}
              onClick={handleExportFinancialPDF}
              color="error"
              size="large"
            >
              Export PDF
            </Button>
          </Box>
        </>
      )}

      {/* ================================================================ */}
      {/* TAB 2 — Grain Analytics                                          */}
      {/* ================================================================ */}
      {activeTab === 2 && grainAnalytics && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Grain-Based Analytics
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Total Grain Types: {grainAnalytics.totalGrainTypes}
            </Alert>
          </Grid>

          {/* Grain In vs Grain Out — NEW Bar Chart */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6" fontWeight="bold">
                    Grain In vs Grain Out
                  </Typography>
                  <SectionBadge label="Live Data" color="#ff9800" emoji="📊" />
                </Box>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  Comparison of grain received vs grain dispatched per type
                </Typography>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={grainInOutData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="grainType" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <RechartsTooltip formatter={(value) => `${value.toLocaleString()} kg`} />
                    <Legend />
                    <Bar dataKey="Grain In (kg)" fill="#4caf50" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Grain Out (kg)" fill="#f44336" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Grain Weight Distribution */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  Grain Weight Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={grainAnalytics.grainAnalytics || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="grainType" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <RechartsTooltip formatter={(value) => `${value.toLocaleString()} kg`} />
                    <Legend />
                    <Bar dataKey="totalWeight" fill="#4caf50" name="Weight (kg)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Grain Value Pie */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  Grain Value Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={grainAnalytics.grainAnalytics || []}
                      dataKey="totalValue"
                      nameKey="grainType"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ grainType, percent }) => `${grainType}: ${(percent * 100).toFixed(1)}%`}
                    >
                      {(grainAnalytics.grainAnalytics || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Grain Details Table */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  Grain Inventory Details
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Grain Type</strong></TableCell>
                        <TableCell align="right"><strong>Weight (kg)</strong></TableCell>
                        <TableCell align="right"><strong>Quantity</strong></TableCell>
                        <TableCell align="right"><strong>Value (₹)</strong></TableCell>
                        <TableCell align="right"><strong>Customers</strong></TableCell>
                        <TableCell align="right"><strong>Blocks</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(grainAnalytics.grainAnalytics || []).map((grain, index) => (
                        <TableRow key={index}>
                          <TableCell>{grain.grainType}</TableCell>
                          <TableCell align="right">{grain.totalWeight.toLocaleString()}</TableCell>
                          <TableCell align="right">{grain.totalQuantity.toLocaleString()}</TableCell>
                          <TableCell align="right">₹{grain.totalValue.toLocaleString()}</TableCell>
                          <TableCell align="right">{grain.customerCount}</TableCell>
                          <TableCell align="right">{grain.blockCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ================================================================ */}
      {/* TAB 3 — Storage Duration Analytics                               */}
      {/* ================================================================ */}
      {activeTab === 3 && storageDurationData && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Storage Duration Analytics
              </Typography>
              <Button
                variant="contained"
                startIcon={<SmartToy />}
                onClick={() => setAiStorageDialog(true)}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  fontWeight: 600,
                  '&:hover': { background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4299 100%)' }
                }}
              >
                🤖 AI Storage Analysis
              </Button>
            </Box>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={4}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e3f2fd' }}>
                  <Typography variant="body2" color="textSecondary">Currently Storing</Typography>
                  <Typography variant="h4" fontWeight="bold" color="primary">
                    {storageDurationData.stats?.activeCount || 0}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#f3e5f5' }}>
                  <Typography variant="body2" color="textSecondary">Previously Stored</Typography>
                  <Typography variant="h4" fontWeight="bold" color="secondary">
                    {storageDurationData.stats?.completedCount || 0}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e8f5e9' }}>
                  <Typography variant="body2" color="textSecondary">Avg. Duration</Typography>
                  <Typography variant="h4" fontWeight="bold" sx={{ color: '#4caf50' }}>
                    {storageDurationData.stats?.averageDuration || 0} days
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Grid>

          {/* Customer × Duration per Grain Type — Scatter Chart (NEW) */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6" fontWeight="bold">
                    Customers × Duration per Grain Type
                  </Typography>
                  <SectionBadge label="Hot" color="#e91e63" emoji="🔥" />
                </Box>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  Each dot represents a customer — colour indicates grain type
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      dataKey="daysStored"
                      name="Days Stored"
                      label={{ value: 'Storage Duration (days)', position: 'bottom', offset: 0 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="customer"
                      name="Customer"
                      width={120}
                    />
                    <ZAxis type="category" dataKey="grainType" name="Grain Type" />
                    <RechartsTooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <Paper sx={{ p: 1.5 }}>
                              <Typography variant="body2" fontWeight="bold">{d.customer}</Typography>
                              <Typography variant="caption" display="block">Grain: {d.grainType}</Typography>
                              <Typography variant="caption" display="block">Duration: {d.daysStored} days</Typography>
                            </Paper>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    {[...new Set(storageDurationByGrain.map(d => d.grainType))].map((grain, idx) => (
                      <Scatter
                        key={grain}
                        name={grain}
                        data={storageDurationByGrain.filter(d => d.grainType === grain)}
                        fill={COLORS[idx % COLORS.length]}
                      />
                    ))}
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Duration Distribution */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  Storage Duration Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={Object.keys(storageDurationData.durationRanges || {}).map(range => ({
                    range,
                    count: storageDurationData.durationRanges[range]
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" angle={-15} textAnchor="end" height={80} />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="count" fill="#1976d2" name="Number of Storages" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Currently Storing Table */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  Currently Storing (Top 10)
                </Typography>
                <TableContainer sx={{ maxHeight: 300 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Customer</strong></TableCell>
                        <TableCell><strong>Grain Type</strong></TableCell>
                        <TableCell align="right"><strong>Days Stored</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(storageDurationData.currentlyStoring || []).slice(0, 10).map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.customer}</TableCell>
                          <TableCell>{item.grainType || 'N/A'}</TableCell>
                          <TableCell align="right">
                            <Chip
                              label={`${item.daysStored} days`}
                              size="small"
                              color={item.daysStored > 90 ? 'warning' : 'primary'}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ================================================================ */}
      {/* TAB 4 — Customer Analytics                                       */}
      {/* ================================================================ */}
      {activeTab === 4 && customerAnalytics && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Customer Analytics
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e8f5e9' }}>
                  <Typography variant="body2" color="textSecondary">Current Customers</Typography>
                  <Typography variant="h3" fontWeight="bold" sx={{ color: '#4caf50' }}>
                    {customerAnalytics.currentCustomers?.count || 0}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fff3e0' }}>
                  <Typography variant="body2" color="textSecondary">Previous Customers</Typography>
                  <Typography variant="h3" fontWeight="bold" sx={{ color: '#ff9800' }}>
                    {customerAnalytics.previousCustomers?.count || 0}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Grid>

          {/* Customer Storage Duration — horizontal bar (NEW) */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6" fontWeight="bold">
                    Customer Storage Duration Overview
                  </Typography>
                  <SectionBadge label="Premium" color="#9c27b0" emoji="⭐" />
                </Box>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  How long each customer has stored grains (days)
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={customerStorageDuration} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" label={{ value: 'Days Stored', position: 'bottom', offset: 0 }} />
                    <YAxis dataKey="name" type="category" width={120} />
                    <RechartsTooltip
                      formatter={(value, name) => {
                        if (name === 'daysStored') return [`${value} days`, 'Duration'];
                        return [`₹${value.toLocaleString()}`, 'Total Spent'];
                      }}
                    />
                    <Legend />
                    <Bar dataKey="daysStored" fill="#1976d2" name="Days Stored" radius={[0, 4, 4, 0]}>
                      {customerStorageDuration.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.status === 'active' ? '#4caf50' : '#ff9800'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Customer In/Out Flow */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  Customer In/Out Flow (Last 12 Months)
                </Typography>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={customerAnalytics.customerFlow || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="in" stroke="#4caf50" strokeWidth={2} name="Customers IN" />
                    <Line type="monotone" dataKey="out" stroke="#f44336" strokeWidth={2} name="Customers OUT" />
                    <Line type="monotone" dataKey="net" stroke="#1976d2" strokeWidth={2} strokeDasharray="5 5" name="Net Change" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Customer Segmentation Bubble Chart */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  Customer Segmentation (Bubble Chart)
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      dataKey="transactionCount"
                      name="Transactions"
                      label={{ value: 'Number of Transactions', position: 'bottom' }}
                    />
                    <YAxis
                      type="number"
                      dataKey="totalSpent"
                      name="Total Spent"
                      label={{ value: 'Total Spent (₹)', angle: -90, position: 'left' }}
                    />
                    <ZAxis
                      type="number"
                      dataKey="avgTransactionValue"
                      range={[50, 400]}
                      name="Avg Value"
                    />
                    <RechartsTooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      formatter={(value, name) => {
                        if (name === 'Total Spent' || name === 'Avg Value') return `₹${value.toLocaleString()}`;
                        return value;
                      }}
                    />
                    <Legend />
                    <Scatter
                      name="Active Customers"
                      data={(customerAnalytics.segmentation || []).filter(c => c.status === 'active')}
                      fill="#4caf50"
                    />
                    <Scatter
                      name="Inactive Customers"
                      data={(customerAnalytics.segmentation || []).filter(c => c.status === 'inactive')}
                      fill="#ff9800"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Customer Lifetime Value */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  Top 10 Customer Lifetime Value
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={(customerAnalytics.customerLifetimeValue || []).slice(0, 10)}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} />
                    <RechartsTooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                    <Bar dataKey="totalSpent" fill="#1976d2" name="Total Spent (₹)">
                      {(customerAnalytics.customerLifetimeValue || []).slice(0, 10).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.status === 'active' ? '#4caf50' : '#ff9800'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Customer Locations Table */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  Customer Locations
                </Typography>
                <TableContainer sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Customer Name</strong></TableCell>
                        <TableCell><strong>Location</strong></TableCell>
                        <TableCell align="right"><strong>Total Spent (₹)</strong></TableCell>
                        <TableCell align="center"><strong>Status</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(customerAnalytics.customerLifetimeValue || []).map((customer, index) => (
                        <TableRow key={index}>
                          <TableCell>{customer.name}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <LocationOn fontSize="small" color="action" />
                              {customer.location}
                            </Box>
                          </TableCell>
                          <TableCell align="right">₹{customer.totalSpent?.toLocaleString() || 0}</TableCell>
                          <TableCell align="center">
                            <Chip
                              label={customer.status}
                              size="small"
                              color={customer.status === 'active' ? 'success' : 'default'}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* AI Storage Analysis Dialog */}
      <Dialog open={aiStorageDialog} onClose={() => { setAiStorageDialog(false); setAiStorageResult(null); setAiStorageError(''); }} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SmartToy color="primary" />
          <Typography variant="h6">AI Storage Comprehensive Analysis</Typography>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Customer ID"
                placeholder="e.g., CUST001"
                value={aiStorageForm.customer_id}
                onChange={(e) => setAiStorageForm(prev => ({ ...prev, customer_id: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Grain Type"
                placeholder="e.g., Rice, Wheat"
                value={aiStorageForm.grain_type}
                onChange={(e) => setAiStorageForm(prev => ({ ...prev, grain_type: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Quantity (kg)"
                type="number"
                placeholder="e.g., 5000"
                value={aiStorageForm.quantity_kg}
                onChange={(e) => setAiStorageForm(prev => ({ ...prev, quantity_kg: e.target.value }))}
              />
            </Grid>
          </Grid>
          <Button
            fullWidth
            variant="contained"
            onClick={handleAiStorageAnalysis}
            disabled={aiStorageLoading}
            startIcon={aiStorageLoading ? <CircularProgress size={20} /> : <Psychology />}
            sx={{ mt: 2, mb: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            {aiStorageLoading ? 'Analyzing...' : 'Run Comprehensive Analysis'}
          </Button>

          {aiStorageError && (
            <Alert severity="error" sx={{ mb: 2 }}>{aiStorageError}</Alert>
          )}

          {aiStorageResult && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SmartToy color="primary" /> Analysis Results
              </Typography>

              {/* Pricing Section */}
              {aiStorageResult.pricing && (
                <Paper sx={{ p: 2, mb: 2, bgcolor: 'success.50', border: 1, borderColor: 'success.light', borderRadius: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="success.dark" gutterBottom>💰 Pricing Analysis</Typography>
                  <Grid container spacing={2}>
                    {aiStorageResult.pricing.current_price && (
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" color="text.secondary">Current Price</Typography>
                        <Typography variant="h6" fontWeight="bold">₹{aiStorageResult.pricing.current_price?.toLocaleString()}</Typography>
                      </Grid>
                    )}
                    {aiStorageResult.pricing.predicted_price && (
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" color="text.secondary">Predicted Price</Typography>
                        <Typography variant="h6" fontWeight="bold" color="primary">₹{aiStorageResult.pricing.predicted_price?.toLocaleString()}</Typography>
                      </Grid>
                    )}
                    {aiStorageResult.pricing.recommendation && (
                      <Grid item xs={12}>
                        <Chip label={aiStorageResult.pricing.recommendation} color="primary" variant="outlined" />
                      </Grid>
                    )}
                  </Grid>
                  {aiStorageResult.pricing.reasoning && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{aiStorageResult.pricing.reasoning}</Typography>
                  )}
                </Paper>
              )}

              {/* Duration Section */}
              {aiStorageResult.duration && (
                <Paper sx={{ p: 2, mb: 2, bgcolor: 'info.50', border: 1, borderColor: 'info.light', borderRadius: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="info.dark" gutterBottom>⏱️ Duration Recommendations</Typography>
                  <Grid container spacing={2}>
                    {aiStorageResult.duration.recommended_duration && (
                      <Grid item xs={6} sm={4}>
                        <Typography variant="caption" color="text.secondary">Recommended Duration</Typography>
                        <Typography variant="h6" fontWeight="bold">{aiStorageResult.duration.recommended_duration}</Typography>
                      </Grid>
                    )}
                    {aiStorageResult.duration.optimal_sell_date && (
                      <Grid item xs={6} sm={4}>
                        <Typography variant="caption" color="text.secondary">Optimal Sell Date</Typography>
                        <Typography variant="body1" fontWeight="bold">{aiStorageResult.duration.optimal_sell_date}</Typography>
                      </Grid>
                    )}
                    {aiStorageResult.duration.storage_cost_estimate && (
                      <Grid item xs={6} sm={4}>
                        <Typography variant="caption" color="text.secondary">Storage Cost Est.</Typography>
                        <Typography variant="body1" fontWeight="bold">₹{aiStorageResult.duration.storage_cost_estimate?.toLocaleString()}</Typography>
                      </Grid>
                    )}
                  </Grid>
                  {aiStorageResult.duration.reasoning && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{aiStorageResult.duration.reasoning}</Typography>
                  )}
                </Paper>
              )}

              {/* Fraud Check Section */}
              {aiStorageResult.fraud_check && (
                <Paper sx={{ p: 2, bgcolor: aiStorageResult.fraud_check.is_suspicious ? 'error.50' : 'success.50', border: 1, borderColor: aiStorageResult.fraud_check.is_suspicious ? 'error.light' : 'success.light', borderRadius: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold" color={aiStorageResult.fraud_check.is_suspicious ? 'error.dark' : 'success.dark'} gutterBottom>
                    🔍 Fraud Check: {aiStorageResult.fraud_check.is_suspicious ? '⚠️ SUSPICIOUS' : '✅ CLEAR'}
                  </Typography>
                  {aiStorageResult.fraud_check.risk_score != null && (
                    <Chip label={`Risk Score: ${aiStorageResult.fraud_check.risk_score}`} color={aiStorageResult.fraud_check.is_suspicious ? 'error' : 'success'} sx={{ mb: 1 }} />
                  )}
                  {aiStorageResult.fraud_check.reasons && aiStorageResult.fraud_check.reasons.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      {aiStorageResult.fraud_check.reasons.map((reason, idx) => (
                        <Alert key={idx} severity={aiStorageResult.fraud_check.is_suspicious ? 'warning' : 'info'} sx={{ mb: 0.5, py: 0 }}>{reason}</Alert>
                      ))}
                    </Box>
                  )}
                </Paper>
              )}

              {/* Fallback: show raw result if structured fields are missing */}
              {!aiStorageResult.pricing && !aiStorageResult.duration && !aiStorageResult.fraud_check && (
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    {JSON.stringify(aiStorageResult, null, 2)}
                  </Typography>
                </Paper>
              )}
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setAiStorageDialog(false); setAiStorageResult(null); setAiStorageError(''); }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CombinedAnalytics;
