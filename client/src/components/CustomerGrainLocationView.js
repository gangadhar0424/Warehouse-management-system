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
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip
} from '@mui/material';
import {
  LocationOn,
  Warehouse,
  Grain,
  Info,
  CheckCircle,
  Schedule
} from '@mui/icons-material';
import axios from 'axios';

const CustomerGrainLocationView = () => {
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchGrainLocations();
  }, []);

  const fetchGrainLocations = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await axios.get('/api/warehouse/allocations/my-locations');
      setAllocations(response.data.allocations || []);
    } catch (err) {
      console.error('Error fetching grain locations:', err);
      setError(err.response?.data?.message || 'Failed to fetch grain locations');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'success',
      expired: 'error',
      extended: 'warning',
      pending: 'info'
    };
    return colors[status] || 'default';
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const calculateDaysRemaining = (endDate) => {
    if (!endDate) return null;
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <LocationOn sx={{ fontSize: 32, color: 'primary.main' }} />
        <Typography variant="h5" fontWeight="bold">
          My Grain Storage Locations
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {allocations.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Warehouse sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No grain storage allocations found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Contact the warehouse owner to store your grains
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {allocations.map((allocation, index) => {
            const daysRemaining = calculateDaysRemaining(allocation.endDate);
            
            return (
              <Grid item xs={12} key={allocation._id}>
                <Card elevation={3}>
                  <CardContent>
                    <Grid container spacing={2}>
                      {/* Allocation Header */}
                      <Grid item xs={12}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Box display="flex" alignItems="center" gap={2}>
                            <Grain sx={{ fontSize: 32, color: 'primary.main' }} />
                            <Box>
                              <Typography variant="h6" fontWeight="bold">
                                Allocation #{index + 1}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Storage ID: {allocation._id?.slice(-8).toUpperCase()}
                              </Typography>
                            </Box>
                          </Box>
                          <Chip
                            label={allocation.status}
                            color={getStatusColor(allocation.status)}
                            icon={<CheckCircle />}
                            sx={{ textTransform: 'capitalize' }}
                          />
                        </Box>
                      </Grid>

                      <Grid item xs={12}>
                        <Divider />
                      </Grid>

                      {/* Location Details */}
                      <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
                          <Typography variant="subtitle2" color="primary.main" fontWeight="bold" gutterBottom>
                            <LocationOn sx={{ fontSize: 18, mr: 1, verticalAlign: 'middle' }} />
                            Warehouse Location
                          </Typography>
                          
                          <Box sx={{ mt: 2 }}>
                            <Grid container spacing={1.5}>
                              <Grid item xs={6}>
                                <Box>
                                  <Typography variant="caption" color="text.secondary">
                                    Building
                                  </Typography>
                                  <Typography variant="body1" fontWeight="bold">
                                    {allocation.allocation?.building || 'N/A'}
                                  </Typography>
                                </Box>
                              </Grid>
                              <Grid item xs={6}>
                                <Box>
                                  <Typography variant="caption" color="text.secondary">
                                    Block
                                  </Typography>
                                  <Typography variant="body1" fontWeight="bold">
                                    {allocation.allocation?.block || 'N/A'}
                                  </Typography>
                                </Box>
                              </Grid>
                              <Grid item xs={6}>
                                <Box>
                                  <Typography variant="caption" color="text.secondary">
                                    Wing
                                  </Typography>
                                  <Typography variant="body1" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>
                                    {allocation.allocation?.wing || 'N/A'}
                                  </Typography>
                                </Box>
                              </Grid>
                              <Grid item xs={6}>
                                <Box>
                                  <Typography variant="caption" color="text.secondary">
                                    Box Number
                                  </Typography>
                                  <Typography variant="body1" fontWeight="bold">
                                    {allocation.allocation?.box || 'N/A'}
                                  </Typography>
                                </Box>
                              </Grid>
                            </Grid>

                            <Box sx={{ mt: 2, p: 1.5, bgcolor: 'background.paper', borderRadius: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                Full Location Path
                              </Typography>
                              <Typography variant="body2" fontWeight="bold" color="primary.main">
                                Building {allocation.allocation?.building} → 
                                Block {allocation.allocation?.block} → 
                                {allocation.allocation?.wing ? ` ${allocation.allocation.wing.charAt(0).toUpperCase() + allocation.allocation.wing.slice(1)} Wing →` : ''} 
                                Box {allocation.allocation?.box}
                              </Typography>
                            </Box>
                          </Box>
                        </Paper>
                      </Grid>

                      {/* Storage Details */}
                      <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
                          <Typography variant="subtitle2" color="success.main" fontWeight="bold" gutterBottom>
                            <Warehouse sx={{ fontSize: 18, mr: 1, verticalAlign: 'middle' }} />
                            Storage Information
                          </Typography>
                          
                          <Box sx={{ mt: 2 }}>
                            <Stack spacing={1.5}>
                              <Box display="flex" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">
                                  Storage Type:
                                </Typography>
                                <Chip
                                  label={allocation.storageDetails?.type || 'Dry'}
                                  size="small"
                                  sx={{ textTransform: 'capitalize' }}
                                />
                              </Box>
                              
                              <Box display="flex" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">
                                  Total Weight:
                                </Typography>
                                <Typography variant="body2" fontWeight="bold">
                                  {allocation.storageDetails?.totalWeight || 0} kg
                                </Typography>
                              </Box>
                              
                              <Box display="flex" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">
                                  Total Value:
                                </Typography>
                                <Typography variant="body2" fontWeight="bold" color="success.main">
                                  ₹{(allocation.storageDetails?.totalValue || 0).toLocaleString('en-IN')}
                                </Typography>
                              </Box>

                              <Divider />
                              
                              <Box display="flex" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">
                                  Start Date:
                                </Typography>
                                <Typography variant="body2" fontWeight="bold">
                                  {formatDate(allocation.startDate)}
                                </Typography>
                              </Box>
                              
                              <Box display="flex" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">
                                  End Date:
                                </Typography>
                                <Typography variant="body2" fontWeight="bold">
                                  {formatDate(allocation.endDate)}
                                </Typography>
                              </Box>

                              {daysRemaining !== null && (
                                <Box
                                  sx={{
                                    p: 1,
                                    bgcolor: daysRemaining <= 7 ? 'error.50' : 'info.50',
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: daysRemaining <= 7 ? 'error.200' : 'info.200'
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    fontWeight="bold"
                                    color={daysRemaining <= 7 ? 'error.main' : 'info.main'}
                                  >
                                    <Schedule sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                                    {daysRemaining > 0
                                      ? `${daysRemaining} days remaining`
                                      : daysRemaining === 0
                                      ? 'Expires today'
                                      : `Expired ${Math.abs(daysRemaining)} days ago`}
                                  </Typography>
                                </Box>
                              )}
                            </Stack>
                          </Box>
                        </Paper>
                      </Grid>

                      {/* Stored Items */}
                      {allocation.storageDetails?.items && allocation.storageDetails.items.length > 0 && (
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 1 }}>
                            Stored Items
                          </Typography>
                          <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell><strong>Description</strong></TableCell>
                                  <TableCell align="right"><strong>Quantity</strong></TableCell>
                                  <TableCell align="right"><strong>Weight (kg)</strong></TableCell>
                                  <TableCell align="right"><strong>Value (₹)</strong></TableCell>
                                  <TableCell align="center"><strong>Entry Date</strong></TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {allocation.storageDetails.items.map((item, idx) => (
                                  <TableRow key={idx} hover>
                                    <TableCell>{item.description || 'N/A'}</TableCell>
                                    <TableCell align="right">{item.quantity || 0}</TableCell>
                                    <TableCell align="right">{item.weight || 0}</TableCell>
                                    <TableCell align="right">₹{(item.value || 0).toLocaleString('en-IN')}</TableCell>
                                    <TableCell align="center">{formatDate(item.entryDate)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Grid>
                      )}

                      {/* Financial Summary */}
                      <Grid item xs={12}>
                        <Paper sx={{ p: 2, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200' }}>
                          <Typography variant="subtitle2" color="warning.main" fontWeight="bold" gutterBottom>
                            Financial Details
                          </Typography>
                          <Grid container spacing={2} sx={{ mt: 0.5 }}>
                            <Grid item xs={6} md={3}>
                              <Typography variant="caption" color="text.secondary">
                                Rent Rate
                              </Typography>
                              <Typography variant="body2" fontWeight="bold">
                                ₹{allocation.rentDetails?.ratePerBag || 0}/bag
                              </Typography>
                            </Grid>
                            <Grid item xs={6} md={3}>
                              <Typography variant="caption" color="text.secondary">
                                Total Rent
                              </Typography>
                              <Typography variant="body2" fontWeight="bold">
                                ₹{(allocation.rentDetails?.totalRent || 0).toLocaleString('en-IN')}
                              </Typography>
                            </Grid>
                            <Grid item xs={6} md={3}>
                              <Typography variant="caption" color="text.secondary">
                                Rent Paid
                              </Typography>
                              <Typography variant="body2" fontWeight="bold" color="success.main">
                                ₹{(allocation.rentDetails?.paidRent || 0).toLocaleString('en-IN')}
                              </Typography>
                            </Grid>
                            <Grid item xs={6} md={3}>
                              <Typography variant="caption" color="text.secondary">
                                Rent Due
                              </Typography>
                              <Typography variant="body2" fontWeight="bold" color="error.main">
                                ₹{(allocation.rentDetails?.dueRent || 0).toLocaleString('en-IN')}
                              </Typography>
                            </Grid>
                          </Grid>
                        </Paper>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
};

export default CustomerGrainLocationView;
