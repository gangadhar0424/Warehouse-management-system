import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  LinearProgress,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Info,
  Refresh,
  ShowChart,
  MonetizationOn,
  Schedule,
  Visibility
} from '@mui/icons-material';
import axios from 'axios';

const PredictionsTab = () => {
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [marketAlerts, setMarketAlerts] = useState([]);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    profitableCount: 0,
    atRiskCount: 0
  });
  const [error, setError] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [detailsDialog, setDetailsDialog] = useState(false);

  useEffect(() => {
    fetchPredictions();
    fetchMarketAlerts();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      fetchPredictions();
      fetchMarketAlerts();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/predictions/dashboard-predictions', {
        headers: { 'x-auth-token': token }
      });
      setPredictions(response.data.predictions || []);
      setAlerts(response.data.alerts || []);
      setStats({
        totalCustomers: response.data.totalCustomers || 0,
        profitableCount: response.data.profitableCount || 0,
        atRiskCount: response.data.atRiskCount || 0
      });
      setError('');
    } catch (err) {
      setError('Failed to fetch predictions. ML service may be unavailable.');
      console.error('Predictions fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketAlerts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/predictions/market-alerts', {
        headers: { 'x-auth-token': token }
      });
      setMarketAlerts(response.data.alerts || []);
    } catch (err) {
      console.error('Market alerts fetch error:', err);
    }
  };

  const handleViewDetails = (customer) => {
    setSelectedCustomer(customer);
    setDetailsDialog(true);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading && predictions.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShowChart /> ML Predictions & Market Intelligence
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => {
            fetchPredictions();
            fetchMarketAlerts();
          }}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h3" fontWeight="bold">
                    {stats.totalCustomers}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Active Storage Customers
                  </Typography>
                </Box>
                <Info sx={{ fontSize: 50, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h3" fontWeight="bold">
                    {stats.profitableCount}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Profitable Customers
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={(stats.profitableCount / stats.totalCustomers) * 100 || 0}
                    sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.3)', '& .MuiLinearProgress-bar': { bgcolor: 'white' } }}
                  />
                </Box>
                <CheckCircle sx={{ fontSize: 50, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h3" fontWeight="bold">
                    {stats.atRiskCount}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    At-Risk Customers
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={(stats.atRiskCount / stats.totalCustomers) * 100 || 0}
                    sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.3)', '& .MuiLinearProgress-bar': { bgcolor: 'white' } }}
                  />
                </Box>
                <Warning sx={{ fontSize: 50, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Market Alerts */}
      {marketAlerts.length > 0 && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUp /> Market Trends & Alerts
          </Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {marketAlerts.map((alert, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Alert
                  severity={getSeverityColor(alert.severity)}
                  icon={alert.priceChange > 0 ? <TrendingUp /> : <TrendingDown />}
                >
                  <Typography variant="subtitle2" fontWeight="bold">
                    {alert.title}
                  </Typography>
                  <Typography variant="body2" component="div">{alert.message}</Typography>
                  <Chip
                    label={`${alert.priceChange > 0 ? '+' : ''}${alert.priceChange}%`}
                    size="small"
                    color={alert.priceChange > 0 ? 'success' : 'error'}
                    sx={{ mt: 1 }}
                  />
                </Alert>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Critical Alerts */}
      {alerts.length > 0 && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning /> Critical Alerts ({alerts.length})
          </Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {alerts.slice(0, 6).map((alert, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Alert severity={getSeverityColor(alert.severity)}>
                  <Typography variant="subtitle2" fontWeight="bold" component="div">
                    {alert.title}
                  </Typography>
                  <Typography variant="body2" component="div">{alert.message}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }} component="div">
                    Customer: {alert.customerName}
                  </Typography>
                </Alert>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Predictions Table */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MonetizationOn /> Customer Predictions
        </Typography>
        <Divider sx={{ my: 2 }} />
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Customer</TableCell>
                <TableCell>Grain Type</TableCell>
                <TableCell align="right">Bags / Weight</TableCell>
                <TableCell align="right">Storage Days</TableCell>
                <TableCell align="right">Predicted Price</TableCell>
                <TableCell align="right">Profit/Loss</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {predictions.map((pred) => (
                <TableRow key={pred.customerId} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {pred.customerName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {pred.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={pred.grainType} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {pred.totalBags} bags
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {pred.totalWeight} kg
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Days in storage">
                      <Chip
                        icon={<Schedule />}
                        label={`${pred.storageDuration}d`}
                        size="small"
                        color={pred.storageDuration > 180 ? 'warning' : 'default'}
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="bold" color="primary">
                      {formatCurrency(pred.predictedPrice * pred.totalWeight)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ₹{pred.predictedPrice.toFixed(2)}/kg
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      color={pred.isProfitable ? 'success.main' : 'error.main'}
                    >
                      {pred.isProfitable ? '+' : ''}{formatCurrency(pred.profitLoss)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {pred.isProfitable ? (
                      <Chip
                        icon={<CheckCircle />}
                        label="Profitable"
                        color="success"
                        size="small"
                      />
                    ) : (
                      <Chip
                        icon={<Warning />}
                        label="At Risk"
                        color="error"
                        size="small"
                      />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => handleViewDetails(pred)}
                        color="primary"
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {predictions.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <ShowChart sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No predictions available
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Predictions will appear once customers have active storage allocations
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Details Dialog */}
      <Dialog open={detailsDialog} onClose={() => setDetailsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Customer Prediction Details
        </DialogTitle>
        <DialogContent dividers>
          {selectedCustomer && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  {selectedCustomer.customerName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedCustomer.email}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, bgcolor: 'primary.50' }}>
                  <Typography variant="caption" color="text.secondary">Grain Type</Typography>
                  <Typography variant="h6">{selectedCustomer.grainType}</Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, bgcolor: 'secondary.50' }}>
                  <Typography variant="caption" color="text.secondary">Total Storage</Typography>
                  <Typography variant="h6">
                    {selectedCustomer.totalBags} bags / {selectedCustomer.totalWeight} kg
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, bgcolor: 'warning.50' }}>
                  <Typography variant="caption" color="text.secondary">Storage Duration</Typography>
                  <Typography variant="h6">{selectedCustomer.storageDuration} days</Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, bgcolor: 'info.50' }}>
                  <Typography variant="caption" color="text.secondary">Total Rent Paid</Typography>
                  <Typography variant="h6">{formatCurrency(selectedCustomer.totalRentPaid)}</Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, bgcolor: 'success.50' }}>
                  <Typography variant="caption" color="text.secondary">Predicted Sale Price</Typography>
                  <Typography variant="h6" color="success.main">
                    {formatCurrency(selectedCustomer.predictedPrice * selectedCustomer.totalWeight)}
                  </Typography>
                  <Typography variant="caption">
                    ₹{selectedCustomer.predictedPrice.toFixed(2)} per kg
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, bgcolor: selectedCustomer.isProfitable ? 'success.50' : 'error.50' }}>
                  <Typography variant="caption" color="text.secondary">Expected Profit/Loss</Typography>
                  <Typography
                    variant="h6"
                    color={selectedCustomer.isProfitable ? 'success.main' : 'error.main'}
                  >
                    {selectedCustomer.isProfitable ? '+' : ''}{formatCurrency(selectedCustomer.profitLoss)}
                  </Typography>
                  <Typography variant="caption">
                    {selectedCustomer.isProfitable ? 'Profitable' : 'At Risk'}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Alert severity={selectedCustomer.isProfitable ? 'success' : 'warning'}>
                  <Typography variant="subtitle2" fontWeight="bold" component="div">
                    {selectedCustomer.isProfitable ? 'Recommendation: Good Position' : 'Recommendation: Monitor Closely'}
                  </Typography>
                  <Typography variant="body2" component="div">
                    {selectedCustomer.isProfitable
                      ? 'This customer is in a profitable position. Market conditions are favorable.'
                      : 'This customer may incur losses. Consider advising them on optimal sale timing or market trends.'}
                  </Typography>
                </Alert>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PredictionsTab;
