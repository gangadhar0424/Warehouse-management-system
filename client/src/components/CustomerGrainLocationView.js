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
      
      // Try the dynamic warehouse endpoint first
      const response = await axios.get('/api/dynamic-warehouse/my-grain-locations');
      console.log('Grain locations response:', response.data);
      setAllocations(response.data.grainLocations || []);
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
          {allocations.map((item, index) => (
              <Grid item xs={12} key={index}>
                <Card elevation={3}>
                  <CardContent>
                    <Grid container spacing={2}>
                      {/* Header */}
                      <Grid item xs={12}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Box display="flex" alignItems="center" gap={2}>
                            <Grain sx={{ fontSize: 32, color: 'primary.main' }} />
                            <Box>
                              <Typography variant="h6" fontWeight="bold">
                                {item.warehouseName}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Slot: {item.location?.slotLabel}
                              </Typography>
                            </Box>
                          </Box>
                          <Chip
                            label={item.slotInfo?.status || 'active'}
                            color={item.slotInfo?.status === 'full' ? 'error' : item.slotInfo?.status === 'partially-filled' ? 'warning' : 'success'}
                            sx={{ textTransform: 'capitalize' }}
                          />
                        </Box>
                      </Grid>

                      <Grid item xs={12}>
                        <Divider />
                      </Grid>

                      {/* Location */}
                      <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2, bgcolor: 'primary.50' }}>
                          <Typography variant="subtitle2" color="primary.main" fontWeight="bold">
                            <LocationOn sx={{ mr: 1, verticalAlign: 'middle' }} />
                            Location
                          </Typography>
                          <Stack spacing={1} sx={{ mt: 2 }}>
                            <Box display="flex" justifyContent="space-between">
                              <Typography variant="body2">Building:</Typography>
                              <Typography variant="body2" fontWeight="bold">{item.location?.building}</Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between">
                              <Typography variant="body2">Block:</Typography>
                              <Typography variant="body2" fontWeight="bold">{item.location?.block}</Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between">
                              <Typography variant="body2">Slot:</Typography>
                              <Typography variant="body2" fontWeight="bold">{item.location?.slotLabel}</Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between">
                              <Typography variant="body2">Position:</Typography>
                              <Typography variant="body2" fontWeight="bold">Row {item.location?.row}, Col {item.location?.col}</Typography>
                            </Box>
                          </Stack>
                        </Paper>
                      </Grid>

                      {/* Storage Info */}
                      <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2, bgcolor: 'success.50' }}>
                          <Typography variant="subtitle2" color="success.main" fontWeight="bold">
                            <Grain sx={{ mr: 1, verticalAlign: 'middle' }} />
                            Storage Details
                          </Typography>
                          <Stack spacing={1} sx={{ mt: 2 }}>
                            <Box display="flex" justifyContent="space-between">
                              <Typography variant="body2">Bags:</Typography>
                              <Typography variant="body2" fontWeight="bold">{item.allocation?.bags} bags</Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between">
                              <Typography variant="body2">Grain Type:</Typography>
                              <Typography variant="body2" fontWeight="bold">{item.allocation?.grainType || 'Not specified'}</Typography>
                            </Box>
                            {item.allocation?.weight > 0 && (
                              <Box display="flex" justifyContent="space-between">
                                <Typography variant="body2">Weight:</Typography>
                                <Typography variant="body2" fontWeight="bold">{item.allocation?.weight} kg</Typography>
                              </Box>
                            )}
                            <Box display="flex" justifyContent="space-between">
                              <Typography variant="body2">Entry Date:</Typography>
                              <Typography variant="body2" fontWeight="bold">{formatDate(item.allocation?.entryDate)}</Typography>
                            </Box>
                          </Stack>
                        </Paper>
                      </Grid>

                      {/* Slot Capacity */}
                      <Grid item xs={12}>
                        <Paper sx={{ p: 2, bgcolor: 'info.50' }}>
                          <Typography variant="subtitle2" color="info.main" fontWeight="bold">
                            Slot Capacity Status
                          </Typography>
                          <Grid container spacing={2} sx={{ mt: 0.5 }}>
                            <Grid item xs={4}>
                              <Typography variant="caption">Total Capacity</Typography>
                              <Typography variant="body2" fontWeight="bold">{item.slotInfo?.capacity} bags</Typography>
                            </Grid>
                            <Grid item xs={4}>
                              <Typography variant="caption">Filled</Typography>
                              <Typography variant="body2" fontWeight="bold">{item.slotInfo?.filledBags} bags</Typography>
                            </Grid>
                            <Grid item xs={4}>
                              <Typography variant="caption">Available</Typography>
                              <Typography variant="body2" fontWeight="bold">{item.slotInfo?.capacity - item.slotInfo?.filledBags} bags</Typography>
                            </Grid>
                          </Grid>
                        </Paper>
                      </Grid>

                      {item.allocation?.notes && (
                        <Grid item xs={12}>
                          <Alert severity="info">
                            <Typography variant="body2"><strong>Notes:</strong> {item.allocation.notes}</Typography>
                          </Alert>
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
        </Grid>
      )}
    </Box>
  );
};

export default CustomerGrainLocationView;
