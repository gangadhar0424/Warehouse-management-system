import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  Button,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  IconButton,
  LinearProgress
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  ShowChart,
  Refresh,
  Info,
  CalendarToday,
  AttachMoney,
  Speed
} from '@mui/icons-material';
import axios from 'axios';

const CustomerMarketPricesAndPredictions = () => {
  const [marketPrices, setMarketPrices] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [customerGrains, setCustomerGrains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    fetchMarketData();
    fetchCustomerGrains();
  }, []);

  const fetchMarketData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await axios.get('/api/market/live-prices');
      setMarketPrices(response.data.prices || []);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching market prices:', err);
      setError(err.response?.data?.message || 'Failed to fetch market prices');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerGrains = async () => {
    try {
      const response = await axios.get('/api/warehouse/allocations/my-locations');
      const allocations = response.data.allocations || [];
      
      // Extract grain types from allocations
      const grains = [];
      allocations.forEach(allocation => {
        if (allocation.storageDetails?.items) {
          allocation.storageDetails.items.forEach(item => {
            if (item.description && !grains.some(g => g.name === item.description)) {
              grains.push({
                name: item.description,
                weight: item.weight || 0,
                quantity: item.quantity || 0,
                entryDate: item.entryDate,
                currentValue: item.value || 0
              });
            }
          });
        }
      });
      
      setCustomerGrains(grains);
    } catch (err) {
      console.error('Error fetching customer grains:', err);
    }
  };

  const fetchPredictions = async () => {
    try {
      setPredictionsLoading(true);
      setError('');

      // Get predictions from ML service
      const response = await axios.post('/api/predictions/grain-prices', {
        grains: customerGrains.map(g => ({
          type: g.name,
          weight: g.weight,
          storageDuration: calculateStorageDays(g.entryDate)
        }))
      });

      setPredictions(response.data.predictions || []);
    } catch (err) {
      console.error('Error fetching predictions:', err);
      setError(err.response?.data?.message || 'Failed to fetch price predictions');
    } finally {
      setPredictionsLoading(false);
    }
  };

  const calculateStorageDays = (entryDate) => {
    if (!entryDate) return 0;
    const today = new Date();
    const entry = new Date(entryDate);
    const diffTime = Math.abs(today - entry);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getPriceChange = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous * 100).toFixed(2);
  };

  const getPriceTrend = (change) => {
    if (change > 0) return 'up';
    if (change < 0) return 'down';
    return 'stable';
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRecommendationColor = (recommendation) => {
    const colors = {
      'sell_now': 'success',
      'hold': 'warning',
      'wait': 'info'
    };
    return colors[recommendation] || 'default';
  };

  const getRecommendationLabel = (recommendation) => {
    const labels = {
      'sell_now': 'Sell Now - High Price',
      'hold': 'Hold - Moderate Price',
      'wait': 'Wait - Price May Rise'
    };
    return labels[recommendation] || recommendation;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box display="flex" alignItems="center" gap={2}>
          <ShowChart sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Market Prices & Predictions
            </Typography>
            {lastUpdate && (
              <Typography variant="caption" color="text.secondary">
                Last updated: {formatDate(lastUpdate)}
              </Typography>
            )}
          </Box>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchMarketData}
          disabled={loading}
        >
          Refresh Prices
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Live Market Prices */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <AttachMoney color="success" />
                <Typography variant="h6" fontWeight="bold">
                  Live Market Prices
                </Typography>
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Grain Type</strong></TableCell>
                      <TableCell align="right"><strong>Current Price (₹/Quintal)</strong></TableCell>
                      <TableCell align="right"><strong>Previous Price</strong></TableCell>
                      <TableCell align="center"><strong>Change</strong></TableCell>
                      <TableCell align="center"><strong>Trend</strong></TableCell>
                      <TableCell align="right"><strong>Market</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {marketPrices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography color="text.secondary">
                            No market data available
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      marketPrices.map((price, index) => {
                        const change = getPriceChange(price.currentPrice, price.previousPrice);
                        const trend = getPriceTrend(change);
                        
                        return (
                          <TableRow key={index} hover>
                            <TableCell>
                              <Typography fontWeight="bold">
                                {price.grainType}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography fontWeight="bold" color="primary.main">
                                ₹{price.currentPrice?.toLocaleString('en-IN')}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" color="text.secondary">
                                ₹{price.previousPrice?.toLocaleString('en-IN')}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={`${change > 0 ? '+' : ''}${change}%`}
                                color={trend === 'up' ? 'success' : trend === 'down' ? 'error' : 'default'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="center">
                              {trend === 'up' ? (
                                <TrendingUp color="success" />
                              ) : trend === 'down' ? (
                                <TrendingDown color="error" />
                              ) : (
                                <Typography variant="body2">-</Typography>
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" color="text.secondary">
                                {price.market || 'Local'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Customer's Stored Grains */}
        {customerGrains.length > 0 && (
          <Grid item xs={12}>
            <Card sx={{ bgcolor: 'info.50', border: '1px solid', borderColor: 'info.200' }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Speed color="info" />
                    <Typography variant="h6" fontWeight="bold">
                      Your Stored Grains - AI Predictions
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={fetchPredictions}
                    disabled={predictionsLoading}
                    startIcon={predictionsLoading ? <CircularProgress size={16} /> : <ShowChart />}
                  >
                    Get Predictions
                  </Button>
                </Box>

                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Grain Type</strong></TableCell>
                        <TableCell align="right"><strong>Quantity</strong></TableCell>
                        <TableCell align="right"><strong>Weight (kg)</strong></TableCell>
                        <TableCell align="center"><strong>Storage Days</strong></TableCell>
                        <TableCell align="right"><strong>Current Value</strong></TableCell>
                        {predictions.length > 0 && (
                          <>
                            <TableCell align="right"><strong>Predicted Price</strong></TableCell>
                            <TableCell align="center"><strong>Recommendation</strong></TableCell>
                            <TableCell align="right"><strong>Confidence</strong></TableCell>
                          </>
                        )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {customerGrains.map((grain, index) => {
                        const prediction = predictions.find(p => 
                          p.grainType?.toLowerCase() === grain.name?.toLowerCase()
                        );
                        const storageDays = calculateStorageDays(grain.entryDate);
                        
                        return (
                          <TableRow key={index} hover>
                            <TableCell>
                              <Typography fontWeight="bold">
                                {grain.name}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">{grain.quantity}</TableCell>
                            <TableCell align="right">{grain.weight}</TableCell>
                            <TableCell align="center">
                              <Chip
                                icon={<CalendarToday />}
                                label={`${storageDays} days`}
                                size="small"
                                color={storageDays > 90 ? 'warning' : 'default'}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Typography fontWeight="bold" color="success.main">
                                ₹{grain.currentValue?.toLocaleString('en-IN')}
                              </Typography>
                            </TableCell>
                            
                            {prediction && (
                              <>
                                <TableCell align="right">
                                  <Typography fontWeight="bold" color="primary.main">
                                    ₹{prediction.predictedPrice?.toLocaleString('en-IN')}
                                  </Typography>
                                  {prediction.priceChange && (
                                    <Typography variant="caption" color="text.secondary">
                                      ({prediction.priceChange > 0 ? '+' : ''}{prediction.priceChange}%)
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell align="center">
                                  <Chip
                                    label={getRecommendationLabel(prediction.recommendation)}
                                    color={getRecommendationColor(prediction.recommendation)}
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <LinearProgress
                                      variant="determinate"
                                      value={prediction.confidence * 100 || 0}
                                      sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                                    />
                                    <Typography variant="caption">
                                      {((prediction.confidence || 0) * 100).toFixed(0)}%
                                    </Typography>
                                  </Box>
                                </TableCell>
                              </>
                            )}
                            
                            {predictions.length === 0 && (
                              <TableCell colSpan={3} align="center">
                                <Typography variant="body2" color="text.secondary">
                                  Click "Get Predictions" to see AI recommendations
                                </Typography>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>

                {predictions.length > 0 && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                      <Info fontSize="small" />
                      Predictions are generated using machine learning models based on historical market data, storage duration, and current trends.
                      Confidence scores indicate the reliability of each prediction.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Market Insights */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
            <Typography variant="subtitle2" fontWeight="bold" color="success.main" gutterBottom>
              Highest Price Today
            </Typography>
            {marketPrices.length > 0 ? (
              <>
                <Typography variant="h5" fontWeight="bold">
                  {marketPrices.reduce((max, p) => p.currentPrice > max.currentPrice ? p : max).grainType}
                </Typography>
                <Typography variant="h6" color="success.main">
                  ₹{marketPrices.reduce((max, p) => p.currentPrice > max.currentPrice ? p : max).currentPrice?.toLocaleString('en-IN')}
                </Typography>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">No data</Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200' }}>
            <Typography variant="subtitle2" fontWeight="bold" color="warning.main" gutterBottom>
              Most Volatile
            </Typography>
            {marketPrices.length > 0 ? (
              <>
                <Typography variant="h5" fontWeight="bold">
                  {marketPrices.reduce((max, p) => {
                    const change = Math.abs(getPriceChange(p.currentPrice, p.previousPrice));
                    const maxChange = Math.abs(getPriceChange(max.currentPrice, max.previousPrice));
                    return change > maxChange ? p : max;
                  }).grainType}
                </Typography>
                <Typography variant="h6" color="warning.main">
                  ±{Math.abs(getPriceChange(
                    marketPrices.reduce((max, p) => {
                      const change = Math.abs(getPriceChange(p.currentPrice, p.previousPrice));
                      const maxChange = Math.abs(getPriceChange(max.currentPrice, max.previousPrice));
                      return change > maxChange ? p : max;
                    }).currentPrice,
                    marketPrices.reduce((max, p) => {
                      const change = Math.abs(getPriceChange(p.currentPrice, p.previousPrice));
                      const maxChange = Math.abs(getPriceChange(max.currentPrice, max.previousPrice));
                      return change > maxChange ? p : max;
                    }).previousPrice
                  ))}%
                </Typography>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">No data</Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, bgcolor: 'info.50', border: '1px solid', borderColor: 'info.200' }}>
            <Typography variant="subtitle2" fontWeight="bold" color="info.main" gutterBottom>
              Your Grain Types
            </Typography>
            <Typography variant="h5" fontWeight="bold">
              {customerGrains.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Different grain types stored
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CustomerMarketPricesAndPredictions;
