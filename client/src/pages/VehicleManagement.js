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
  Tooltip
} from '@mui/material';
import {
  LocalShipping,
  Add,
  Edit,
  Visibility,
  ExitToApp,
  CallReceived,
  Grain,
  Scale,
  Schedule,
  CheckCircle
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import axios from 'axios';

const VehicleManagement = () => {
  const { user } = useAuth();
  const { addNotification } = useSocket();
  const [activeTab, setActiveTab] = useState(0);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dialogs
  const [entryDialog, setEntryDialog] = useState(false);
  const [exitDialog, setExitDialog] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  // Forms
  const [entryForm, setEntryForm] = useState({
    vehicleNumber: '',
    vehicleType: 'truck',
    driverName: '',
    driverPhone: '',
    driverCountryCode: '+91',
    grainDetails: {
      grainType: 'rice',
      isIncoming: true,
      estimatedBags: '',
      actualBags: '',
      avgBagWeight: '50',
      totalWeight: '',
      qualityGrade: 'A',
      purpose: 'storage' // storage, delivery, pickup
    },
    destination: {
      warehouseSection: '',
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      customerCountryCode: '+91'
    }
  });

  // Phone validation for Indian numbers
  const validateIndianPhone = (phone) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  // Email validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate all form fields
  const validateEntryForm = () => {
    const errors = [];
    
    if (!entryForm.vehicleNumber.trim()) {
      errors.push('Vehicle number is required');
    }
    if (!entryForm.driverName.trim()) {
      errors.push('Driver name is required');
    }
    if (!entryForm.driverPhone.trim()) {
      errors.push('Driver phone is required');
    } else if (entryForm.driverCountryCode === '+91' && !validateIndianPhone(entryForm.driverPhone)) {
      errors.push('Driver phone must be 10 digits and start with 6, 7, 8, or 9');
    }
    if (!entryForm.grainDetails.actualBags || entryForm.grainDetails.actualBags <= 0) {
      errors.push('Number of bags must be greater than 0');
    }
    if (!entryForm.destination.customerPhone.trim()) {
      errors.push('Customer phone is required');
    } else if (entryForm.destination.customerCountryCode === '+91' && !validateIndianPhone(entryForm.destination.customerPhone)) {
      errors.push('Customer phone must be 10 digits and start with 6, 7, 8, or 9');
    }
    if (!entryForm.destination.customerEmail.trim()) {
      errors.push('Customer email is required');
    } else if (!validateEmail(entryForm.destination.customerEmail)) {
      errors.push('Please enter a valid email address');
    }
    if (!entryForm.destination.customerName.trim()) {
      errors.push('Customer name is required');
    }
    
    return errors;
  };

  const [exitForm, setExitForm] = useState({
    exitWeight: '',
    actualBags: '',
    remarks: '',
    paymentStatus: 'pending'
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/vehicles');
      setVehicles(response.data.vehicles || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      setError('Failed to fetch vehicles');
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleEntry = async () => {
    try {
      setError('');
      
      // Validate form
      const validationErrors = validateEntryForm();
      if (validationErrors.length > 0) {
        setError(validationErrors.join('. '));
        return;
      }
      
      setLoading(true);

      const entryData = {
        ...entryForm,
        driverPhone: `${entryForm.driverCountryCode}${entryForm.driverPhone}`,
        destination: {
          ...entryForm.destination,
          customerPhone: entryForm.destination.customerPhone 
            ? `${entryForm.destination.customerCountryCode}${entryForm.destination.customerPhone}`
            : ''
        },
        grainDetails: {
          ...entryForm.grainDetails,
          totalWeight: entryForm.grainDetails.actualBags * entryForm.grainDetails.avgBagWeight
        },
        status: 'inside',
        entryTime: new Date()
      };

      const response = await axios.post('/api/vehicles/grain-entry', entryData);
      
      setSuccess('Vehicle entry registered successfully with grain details!');
      addNotification({
        type: 'success',
        title: 'Vehicle Entry',
        message: `Vehicle ${entryForm.vehicleNumber} entered with ${entryForm.grainDetails.actualBags} bags of ${entryForm.grainDetails.grainType}`,
        timestamp: new Date()
      });

      setEntryDialog(false);
      setEntryForm({
        vehicleNumber: '',
        vehicleType: 'truck',
        driverName: '',
        driverPhone: '',
        driverCountryCode: '+91',
        grainDetails: {
          grainType: 'rice',
          isIncoming: true,
          estimatedBags: '',
          actualBags: '',
          avgBagWeight: '50',
          totalWeight: '',
          qualityGrade: 'A',
          purpose: 'storage'
        },
        destination: {
          warehouseSection: '',
          customerName: '',
          customerEmail: '',
          customerPhone: '',
          customerCountryCode: '+91'
        }
      });
      
      fetchVehicles();
    } catch (error) {
      console.error('Error registering vehicle entry:', error);
      setError(error.response?.data?.message || 'Failed to register vehicle entry');
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleExit = async () => {
    try {
      setError('');
      setLoading(true);

      const exitData = {
        vehicleId: selectedVehicle._id,
        ...exitForm,
        exitTime: new Date()
      };

      const response = await axios.post('/api/vehicles/grain-exit', exitData);
      
      setSuccess('Vehicle exit registered successfully!');
      addNotification({
        type: 'success',
        title: 'Vehicle Exit',
        message: `Vehicle ${selectedVehicle.vehicleNumber} exited successfully`,
        timestamp: new Date()
      });

      setExitDialog(false);
      setSelectedVehicle(null);
      setExitForm({
        exitWeight: '',
        actualBags: '',
        remarks: '',
        paymentStatus: 'pending'
      });
      
      fetchVehicles();
    } catch (error) {
      console.error('Error registering vehicle exit:', error);
      setError(error.response?.data?.message || 'Failed to register vehicle exit');
    } finally {
      setLoading(false);
    }
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      inside: { color: 'warning', icon: <CallReceived fontSize="small" /> },
      exited: { color: 'success', icon: <ExitToApp fontSize="small" /> },
      weighing: { color: 'info', icon: <Scale fontSize="small" /> }
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

  const currentVehicles = vehicles.filter(v => v.status === 'inside');
  const recentExits = vehicles.filter(v => v.status === 'exited').slice(0, 10);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          🚛 Vehicle & Grain Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setEntryDialog(true)}
          disabled={user?.role === 'customer'}
        >
          Vehicle Entry
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

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <LocalShipping color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Currently Inside
                  </Typography>
                  <Typography variant="h4">
                    {currentVehicles.length}
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
                <Grain color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Grain Bags
                  </Typography>
                  <Typography variant="h4">
                    {currentVehicles.reduce((sum, v) => sum + (v.grainDetails?.actualBags || 0), 0)}
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
                <Scale color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Weight (kg)
                  </Typography>
                  <Typography variant="h4">
                    {currentVehicles.reduce((sum, v) => sum + (v.grainDetails?.totalWeight || 0), 0)}
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
                <Schedule color="info" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Today's Exits
                  </Typography>
                  <Typography variant="h4">
                    {recentExits.filter(v => 
                      new Date(v.exitTime).toDateString() === new Date().toDateString()
                    ).length}
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
          <Tab label={`Currently Inside (${currentVehicles.length})`} />
          <Tab label={`Recent Exits (${recentExits.length})`} />
          <Tab label="All Vehicles" />
        </Tabs>
      </Paper>

      {/* Vehicle Tables */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Vehicle Number</TableCell>
              <TableCell>Driver</TableCell>
              <TableCell>Grain Type</TableCell>
              <TableCell>Bags</TableCell>
              <TableCell>Weight (kg)</TableCell>
              <TableCell>Purpose</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Entry Time</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(activeTab === 0 ? currentVehicles : 
              activeTab === 1 ? recentExits : vehicles).map((vehicle) => (
              <TableRow key={vehicle._id}>
                <TableCell>
                  <Typography variant="subtitle2">
                    {vehicle.vehicleNumber}
                  </Typography>
                </TableCell>
                <TableCell>{vehicle.driverName}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Grain fontSize="small" sx={{ mr: 1 }} />
                    {vehicle.grainDetails?.grainType || 'N/A'}
                  </Box>
                </TableCell>
                <TableCell>{vehicle.grainDetails?.actualBags || 0}</TableCell>
                <TableCell>{vehicle.grainDetails?.totalWeight || 0}</TableCell>
                <TableCell>
                  <Chip 
                    label={vehicle.grainDetails?.purpose || 'storage'} 
                    size="small" 
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>{getStatusChip(vehicle.status)}</TableCell>
                <TableCell>
                  {vehicle.entryTime ? new Date(vehicle.entryTime).toLocaleString() : 'N/A'}
                </TableCell>
                <TableCell>
                  {vehicle.status === 'inside' && (
                    <Tooltip title="Vehicle Exit">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedVehicle(vehicle);
                          setExitDialog(true);
                        }}
                        disabled={user?.role === 'customer'}
                      >
                        <ExitToApp />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Vehicle Entry Dialog */}
      <Dialog open={entryDialog} onClose={() => setEntryDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>🚛 Vehicle Entry with Grain Details</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Vehicle Details */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Vehicle Information</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Vehicle Number"
                value={entryForm.vehicleNumber}
                onChange={(e) => setEntryForm(prev => ({...prev, vehicleNumber: e.target.value.toUpperCase()}))}
                placeholder="TN01AB1234"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Vehicle Type</InputLabel>
                <Select
                  value={entryForm.vehicleType}
                  onChange={(e) => setEntryForm(prev => ({...prev, vehicleType: e.target.value}))}
                >
                  <MenuItem value="truck">Truck</MenuItem>
                  <MenuItem value="mini-truck">Mini Truck</MenuItem>
                  <MenuItem value="tractor">Tractor</MenuItem>
                  <MenuItem value="trailer">Trailer</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Driver Name"
                value={entryForm.driverName}
                onChange={(e) => setEntryForm(prev => ({...prev, driverName: e.target.value}))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <FormControl sx={{ minWidth: 100 }}>
                  <InputLabel>Code</InputLabel>
                  <Select
                    value={entryForm.driverCountryCode}
                    onChange={(e) => setEntryForm(prev => ({...prev, driverCountryCode: e.target.value}))}
                    label="Code"
                  >
                    <MenuItem value="+91">🇮🇳 +91</MenuItem>
                    <MenuItem value="+1">🇺🇸 +1</MenuItem>
                    <MenuItem value="+44">🇬🇧 +44</MenuItem>
                    <MenuItem value="+971">🇦🇪 +971</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  required
                  label="Driver Phone"
                  value={entryForm.driverPhone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setEntryForm(prev => ({...prev, driverPhone: value}));
                  }}
                  inputProps={{ maxLength: 10 }}
                  placeholder="9876543210"
                  error={entryForm.driverPhone && entryForm.driverCountryCode === '+91' && !validateIndianPhone(entryForm.driverPhone)}
                  helperText={entryForm.driverPhone && entryForm.driverCountryCode === '+91' && !validateIndianPhone(entryForm.driverPhone) ? 'Must be 10 digits starting with 6-9' : ''}
                />
              </Box>
            </Grid>

            {/* Grain Details */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>🌾 Grain Details</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Grain Type</InputLabel>
                <Select
                  value={entryForm.grainDetails.grainType}
                  onChange={(e) => setEntryForm(prev => ({
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
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Purpose</InputLabel>
                <Select
                  value={entryForm.grainDetails.purpose}
                  onChange={(e) => setEntryForm(prev => ({
                    ...prev, 
                    grainDetails: {...prev.grainDetails, purpose: e.target.value}
                  }))}
                >
                  <MenuItem value="storage">Storage</MenuItem>
                  <MenuItem value="delivery">Delivery</MenuItem>
                  <MenuItem value="pickup">Pickup</MenuItem>
                  <MenuItem value="processing">Processing</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Number of Bags"
                type="number"
                value={entryForm.grainDetails.actualBags}
                onChange={(e) => setEntryForm(prev => ({
                  ...prev, 
                  grainDetails: {...prev.grainDetails, actualBags: parseInt(e.target.value) || 0}
                }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Avg Bag Weight (kg)"
                type="number"
                value={entryForm.grainDetails.avgBagWeight}
                onChange={(e) => setEntryForm(prev => ({
                  ...prev, 
                  grainDetails: {...prev.grainDetails, avgBagWeight: parseInt(e.target.value) || 50}
                }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Quality Grade</InputLabel>
                <Select
                  value={entryForm.grainDetails.qualityGrade}
                  onChange={(e) => setEntryForm(prev => ({
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

            {/* Destination Details */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>📍 Destination Details</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Customer Name"
                value={entryForm.destination.customerName}
                onChange={(e) => setEntryForm(prev => ({
                  ...prev, 
                  destination: {...prev.destination, customerName: e.target.value}
                }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Customer Email"
                type="email"
                value={entryForm.destination.customerEmail}
                onChange={(e) => setEntryForm(prev => ({
                  ...prev, 
                  destination: {...prev.destination, customerEmail: e.target.value.toLowerCase()}
                }))}
                placeholder="customer@example.com"
                error={entryForm.destination.customerEmail && !validateEmail(entryForm.destination.customerEmail)}
                helperText={entryForm.destination.customerEmail && !validateEmail(entryForm.destination.customerEmail) ? 'Please enter a valid email address' : ''}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <FormControl sx={{ minWidth: 100 }}>
                  <InputLabel>Code</InputLabel>
                  <Select
                    value={entryForm.destination.customerCountryCode}
                    onChange={(e) => setEntryForm(prev => ({
                      ...prev,
                      destination: {...prev.destination, customerCountryCode: e.target.value}
                    }))}
                    label="Code"
                  >
                    <MenuItem value="+91">🇮🇳 +91</MenuItem>
                    <MenuItem value="+1">🇺🇸 +1</MenuItem>
                    <MenuItem value="+44">🇬🇧 +44</MenuItem>
                    <MenuItem value="+971">🇦🇪 +971</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  required
                  label="Customer Phone"
                  value={entryForm.destination.customerPhone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setEntryForm(prev => ({
                      ...prev, 
                      destination: {...prev.destination, customerPhone: value}
                    }));
                  }}
                  inputProps={{ maxLength: 10 }}
                  placeholder="9876543210"
                  error={entryForm.destination.customerPhone && entryForm.destination.customerCountryCode === '+91' && !validateIndianPhone(entryForm.destination.customerPhone)}
                  helperText={entryForm.destination.customerPhone && entryForm.destination.customerCountryCode === '+91' && !validateIndianPhone(entryForm.destination.customerPhone) ? 'Must be 10 digits starting with 6-9' : ''}
                />
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEntryDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleVehicleEntry} 
            variant="contained"
            disabled={!entryForm.vehicleNumber || !entryForm.driverName || !entryForm.grainDetails.actualBags}
          >
            Register Entry
          </Button>
        </DialogActions>
      </Dialog>

      {/* Vehicle Exit Dialog */}
      <Dialog open={exitDialog} onClose={() => setExitDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>🚛 Vehicle Exit - {selectedVehicle?.vehicleNumber}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                Original Bags: {selectedVehicle?.grainDetails?.actualBags} | 
                Original Weight: {selectedVehicle?.grainDetails?.totalWeight} kg
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Exit Weight (kg)"
                type="number"
                value={exitForm.exitWeight}
                onChange={(e) => setExitForm(prev => ({...prev, exitWeight: e.target.value}))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Actual Bags at Exit"
                type="number"
                value={exitForm.actualBags}
                onChange={(e) => setExitForm(prev => ({...prev, actualBags: e.target.value}))}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Payment Status</InputLabel>
                <Select
                  value={exitForm.paymentStatus}
                  onChange={(e) => setExitForm(prev => ({...prev, paymentStatus: e.target.value}))}
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                  <MenuItem value="partial">Partial</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Remarks"
                multiline
                rows={3}
                value={exitForm.remarks}
                onChange={(e) => setExitForm(prev => ({...prev, remarks: e.target.value}))}
                placeholder="Any additional notes about the exit..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExitDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleVehicleExit} 
            variant="contained" 
            color="success"
          >
            Register Exit
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default VehicleManagement;