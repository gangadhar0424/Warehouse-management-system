import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Divider,
  Chip,
  CircularProgress,
  Tabs,
  Tab,
  Tooltip,
  InputAdornment,
  IconButton,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
  FormHelperText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  LocalShipping,
  Scale,
  Payment,
  Receipt,
  QrCode,
  Print,
  Info,
  MonetizationOn,
  CheckCircle,
  Person,
  Phone,
  Email,
  Inventory,
  Badge,
  DirectionsCar,
  Close
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import axios from 'axios';

const WeighBridge = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Vehicle Entry Form
  const [vehicleForm, setVehicleForm] = useState({
    vehicleNumber: '',
    vehicleType: 'truck',
    driverName: '',
    driverPhone: '',
    driverLicense: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    visitPurpose: '', // 'weighing_only' or 'grain_loading'
    weighingOption: '', // 'empty_now', 'loaded_now', 'will_return'
    emptyWeight: '', // Weight if vehicle is empty now
    loadedWeight: '', // Weight when vehicle is loaded
    emptyWeightForLoaded: '', // Empty vehicle weight (for loaded_now and will_return)
    grainWeight: '', // Calculated grain weight
    capacity: {
      weight: '',
      volume: ''
    },
    cargo: {
      description: '',
      quantity: '',
      unit: 'kg'
    }
  });

  // Payment Form
  const [paymentForm, setPaymentForm] = useState({
    weighingFee: 100, // Fixed fee for weighing
    paymentMethod: 'cash' // 'cash' or 'upi'
  });

  const [paymentDialog, setPaymentDialog] = useState(false);
  const [upiQrDialog, setUpiQrDialog] = useState(false);
  const [upiQrCode, setUpiQrCode] = useState('');
  const [registeredVehicle, setRegisteredVehicle] = useState(null);

  const { user } = useAuth();
  const { addNotification } = useSocket();

  useEffect(() => {
    fetchVehicles();
  }, []);

  // Calculate grain weight automatically
  useEffect(() => {
    if (vehicleForm.loadedWeight && vehicleForm.emptyWeightForLoaded) {
      const loaded = parseFloat(vehicleForm.loadedWeight) || 0;
      const empty = parseFloat(vehicleForm.emptyWeightForLoaded) || 0;
      const grain = loaded - empty;
      setVehicleForm(prev => ({
        ...prev,
        grainWeight: grain > 0 ? grain.toFixed(2) : ''
      }));
    } else {
      setVehicleForm(prev => ({
        ...prev,
        grainWeight: ''
      }));
    }
  }, [vehicleForm.loadedWeight, vehicleForm.emptyWeightForLoaded]);

  // Debug: Log form state changes
  useEffect(() => {
    console.log('Vehicle Form State Updated:', {
      visitPurpose: vehicleForm.visitPurpose,
      weighingOption: vehicleForm.weighingOption,
      customerName: vehicleForm.customerName,
      customerEmail: vehicleForm.customerEmail
    });
  }, [vehicleForm.visitPurpose, vehicleForm.weighingOption, vehicleForm.customerName, vehicleForm.customerEmail]);

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

  const handleVehicleFormChange = (e) => {
    const { name, value } = e.target;
    
    console.log('Form field changed:', name, '=', value);
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setVehicleForm(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setVehicleForm(prev => {
        const newState = {
          ...prev,
          [name]: value
        };
        console.log('New form state:', newState);
        return newState;
      });
    }
  };

  const handleVehicleEntry = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate required fields before sending
      if (!vehicleForm.visitPurpose) {
        setError('Please select Visit Purpose');
        setLoading(false);
        return;
      }
      
      if (!vehicleForm.weighingOption) {
        setError('Please select Vehicle Current Status (Empty/Loaded/Will Return)');
        setLoading(false);
        return;
      }

      if (vehicleForm.visitPurpose === 'grain_loading') {
        if (!vehicleForm.customerName || !vehicleForm.customerPhone || !vehicleForm.customerEmail) {
          setError('Customer details are required for Grain Loading/Unloading');
          setLoading(false);
          return;
        }
      }

      // Prepare vehicle data
      const vehicleData = {
        ...vehicleForm,
        weighingOption: vehicleForm.weighingOption,
      };

      console.log('Sending vehicle data:', vehicleData);

      // If empty weight is provided, add it to weighBridgeData
      if (vehicleForm.weighingOption === 'empty_now' && vehicleForm.emptyWeight) {
        vehicleData.weighBridgeData = {
          tareWeight: parseFloat(vehicleForm.emptyWeight),
          firstWeighTime: new Date()
        };
        vehicleData.weighingStatus = 'partial';
      } else if (vehicleForm.weighingOption === 'loaded_now' && vehicleForm.loadedWeight && vehicleForm.emptyWeightForLoaded) {
        vehicleData.weighBridgeData = {
          grossWeight: parseFloat(vehicleForm.loadedWeight),
          tareWeight: parseFloat(vehicleForm.emptyWeightForLoaded),
          netWeight: parseFloat(vehicleForm.grainWeight),
          firstWeighTime: new Date(),
          secondWeighTime: new Date()
        };
        vehicleData.weighingStatus = 'completed';
      } else if (vehicleForm.weighingOption === 'will_return' && vehicleForm.loadedWeight && vehicleForm.emptyWeightForLoaded) {
        vehicleData.weighBridgeData = {
          grossWeight: parseFloat(vehicleForm.loadedWeight),
          tareWeight: parseFloat(vehicleForm.emptyWeightForLoaded),
          netWeight: parseFloat(vehicleForm.grainWeight),
          firstWeighTime: new Date(),
          secondWeighTime: new Date()
        };
        vehicleData.weighingStatus = 'completed';
      } else if (vehicleForm.weighingOption === 'loaded_now' || vehicleForm.weighingOption === 'will_return') {
        vehicleData.weighingStatus = 'not_started';
      }

      const response = await axios.post('/api/vehicles/entry', vehicleData);
      
      let successMessage = 'Vehicle entry registered successfully!';
      if (response.data.customerInfo) {
        successMessage += ` ${response.data.customerInfo.message}`;
      }
      
      setSuccess(successMessage);
      addNotification({
        type: 'success',
        title: 'Vehicle Entry',
        message: `Vehicle ${vehicleForm.vehicleNumber} registered successfully`,
        timestamp: new Date()
      });

      // Show payment dialog for weighing_only vehicles
      if (response.data.visitPurpose === 'weighing_only') {
        setRegisteredVehicle(response.data.vehicle);
        setPaymentDialog(true);
      } else {
        setSuccess('Vehicle added to loading queue successfully!');
      }

      // Reset form
      setVehicleForm({
        vehicleNumber: '',
        vehicleType: 'truck',
        driverName: '',
        driverPhone: '',
        driverLicense: '',
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        visitPurpose: '',
        weighingOption: '',
        emptyWeight: '',
        loadedWeight: '',
        emptyWeightForLoaded: '',
        grainWeight: '',
        capacity: { weight: '', volume: '' },
        cargo: { description: '', quantity: '', unit: 'kg' }
      });

      fetchVehicles();
      
    } catch (error) {
      console.error('Vehicle entry error:', error.response?.data);
      if (error.response?.data?.errors) {
        // Validation errors from express-validator
        const errorMessages = error.response.data.errors.map(err => `${err.param}: ${err.msg}`).join(', ');
        setError(`Validation Error: ${errorMessages}`);
      } else {
        setError(error.response?.data?.message || 'Failed to register vehicle entry');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleWeighVehicle = async (vehicle) => {
    const weight = prompt('Enter vehicle weight (kg):');
    if (!weight || isNaN(weight)) {
      setError('Invalid weight entered');
      return;
    }

    setLoading(true);
    try {
      // Determine if this is first or second weighing
      const isSecondWeigh = vehicle.weighingStatus === 'partial';
      
      const response = await axios.put(`/api/vehicles/${vehicle._id}/weigh`, {
        weight: parseFloat(weight),
        weighType: isSecondWeigh ? 'gross' : 'tare'
      });
      
      const isPartial = response.data.vehicle.weighingStatus === 'partial';
      setSuccess(isPartial 
        ? 'First weighing (Empty) recorded! Vehicle can come back with load for second weighing.' 
        : 'Vehicle weighed successfully! Both weighings completed.');
      
      addNotification({
        type: 'success',
        title: 'Vehicle Weighed',
        message: isPartial 
          ? `Empty weight recorded: ${weight} kg` 
          : `Net weight: ${response.data.vehicle.weighBridgeData.netWeight} kg`,
        timestamp: new Date()
      });

      fetchVehicles();
      
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to weigh vehicle');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!registeredVehicle) return;

    setLoading(true);
    setError('');
    
    try {
      const weighingFee = parseFloat(paymentForm.weighingFee) || 100;

      // For UPI, show QR code dialog
      if (paymentForm.paymentMethod === 'upi') {
        await generateUPIQRCode(weighingFee);
        return;
      }

      // For cash, process payment immediately
      if (paymentForm.paymentMethod === 'cash') {
        await processPayment(weighingFee, 'cash');
      }
      
    } catch (error) {
      console.error('Payment error:', error);
      setError(error.response?.data?.message || 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  const generateUPIQRCode = async (amount) => {
    try {
      // Create UPI payment string
      const upiString = `upi://pay?pa=warehouse@upi&pn=Warehouse Management&am=${amount}&cu=INR&tn=Weighbridge Fee - ${registeredVehicle.vehicleNumber}`;
      
      // Request QR code from backend
      const response = await axios.post('/api/payments/generate-upi-qr', {
        upiString,
        amount,
        vehicleNumber: registeredVehicle.vehicleNumber
      });

      setUpiQrCode(response.data.qrCode);
      setUpiQrDialog(true);
      setPaymentDialog(false);
      setLoading(false);
      
    } catch (error) {
      console.error('QR generation error:', error);
      setError('Failed to generate UPI QR code');
      setLoading(false);
    }
  };

  const confirmUPIPayment = async () => {
    const weighingFee = parseFloat(paymentForm.weighingFee) || 100;
    setLoading(true);
    try {
      await processPayment(weighingFee, 'upi');
      setUpiQrDialog(false);
    } catch (error) {
      setError('Failed to confirm payment');
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async (amount, paymentMethod) => {
    try {
      // Create payment transaction
      const paymentData = {
        type: 'weigh_bridge',
        customer: registeredVehicle.customer?._id || null,
        vehicle: registeredVehicle._id,
        amount: {
          baseAmount: amount,
          totalAmount: amount
        },
        payment: {
          method: paymentMethod,
          status: 'completed',
          transactionDate: new Date()
        },
        description: `Weighbridge charges for vehicle ${registeredVehicle.vehicleNumber}`,
        items: [{
          description: 'Weighbridge Fee',
          quantity: 1,
          unitPrice: amount,
          totalPrice: amount
        }]
      };

      const response = await axios.post('/api/payments/create', paymentData);

      // Update vehicle payment status
      await axios.put(`/api/vehicles/${registeredVehicle._id}`, {
        paymentStatus: 'paid',
        paymentAmount: amount,
        paymentMethod: paymentMethod,
        paymentDate: new Date()
      });

      setSuccess(`✅ Payment of ₹${amount} received successfully via ${paymentMethod.toUpperCase()}!`);
      setPaymentDialog(false);
      
      // Notify via socket
      addNotification({
        type: 'success',
        title: 'Payment Completed',
        message: `Weighbridge payment of ₹${amount} received for vehicle ${registeredVehicle.vehicleNumber}`,
        timestamp: new Date()
      });

      // Reset
      setRegisteredVehicle(null);
      setUpiQrCode('');
      await fetchVehicles();
      
    } catch (error) {
      console.error('Payment processing error:', error);
      throw error;
    }
  };

  const VehicleList = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Active Vehicles
        </Typography>
        
        {loading && <CircularProgress />}
        
        {vehicles.length === 0 && !loading && (
          <Alert severity="info" sx={{ mt: 2 }}>
            No vehicles registered yet. Register a vehicle in the "Vehicle Entry" tab.
          </Alert>
        )}
        
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Vehicle #</strong></TableCell>
                <TableCell><strong>Type</strong></TableCell>
                <TableCell><strong>Driver</strong></TableCell>
                <TableCell><strong>Purpose</strong></TableCell>
                <TableCell><strong>Weighing Status</strong></TableCell>
                <TableCell><strong>Weight Info</strong></TableCell>
                <TableCell><strong>Payment</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vehicles.filter(v => v.status !== 'exited').map((vehicle) => (
                <TableRow key={vehicle._id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="600">
                      {vehicle.vehicleNumber}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(vehicle.entryTime).toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={vehicle.vehicleType} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{vehicle.driverName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {vehicle.driverPhone}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={vehicle.visitPurpose === 'weighing_only' ? 'Weighing Only' : 'Grain Loading'}
                      color={vehicle.visitPurpose === 'weighing_only' ? 'info' : 'primary'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={
                        vehicle.weighingStatus === 'completed' ? 'Completed' :
                        vehicle.weighingStatus === 'partial' ? 'Partial (1/2)' :
                        'Not Started'
                      }
                      color={
                        vehicle.weighingStatus === 'completed' ? 'success' :
                        vehicle.weighingStatus === 'partial' ? 'warning' :
                        'default'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {vehicle.weighBridgeData?.tareWeight && (
                      <Typography variant="caption" display="block">
                        Empty: {vehicle.weighBridgeData.tareWeight} kg
                      </Typography>
                    )}
                    {vehicle.weighBridgeData?.grossWeight && (
                      <Typography variant="caption" display="block">
                        Loaded: {vehicle.weighBridgeData.grossWeight} kg
                      </Typography>
                    )}
                    {vehicle.weighBridgeData?.netWeight && (
                      <Typography variant="caption" display="block" fontWeight="600" color="primary">
                        Net: {vehicle.weighBridgeData.netWeight} kg
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={vehicle.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                      color={vehicle.paymentStatus === 'paid' ? 'success' : 'error'}
                      size="small"
                      icon={vehicle.paymentStatus === 'paid' ? <CheckCircle /> : <Payment />}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {vehicle.weighingStatus !== 'completed' && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Scale />}
                          onClick={() => handleWeighVehicle(vehicle)}
                        >
                          {vehicle.weighingStatus === 'partial' ? '2nd Weigh' : 'Weigh'}
                        </Button>
                      )}
                      
                      {vehicle.paymentStatus !== 'paid' && (
                        <Button
                          size="small"
                          variant="contained"
                          color="warning"
                          startIcon={<Payment />}
                          onClick={() => {
                            setRegisteredVehicle(vehicle);
                            setPaymentDialog(true);
                          }}
                        >
                          Pay
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Scale fontSize="large" color="primary" />
          Weigh Bridge Module
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Register vehicles, record weights, and process weighbridge payments
        </Typography>
      </Paper>

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

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Vehicle Entry" icon={<LocalShipping />} iconPosition="start" />
          <Tab label="Active Vehicles" icon={<Inventory />} iconPosition="start" />
        </Tabs>
      </Box>

      {activeTab === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <LocalShipping sx={{ mr: 1, verticalAlign: 'middle' }} />
              Register New Vehicle
            </Typography>
            
            <Box component="form" onSubmit={handleVehicleEntry} sx={{ mt: 3 }}>
              <Grid container spacing={3}>
                {/* Vehicle Information */}
                <Grid item xs={12}>
                  <Paper elevation={2} sx={{ p: 3, bgcolor: '#f5f5f5' }}>
                    <Typography variant="subtitle1" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DirectionsCar color="primary" />
                      Vehicle Information
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          required
                          label="Vehicle Number"
                          name="vehicleNumber"
                          value={vehicleForm.vehicleNumber}
                          onChange={handleVehicleFormChange}
                          placeholder="e.g., AP09AB1234"
                          inputProps={{ style: { textTransform: 'uppercase' } }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <DirectionsCar color="action" />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth required>
                          <InputLabel>Vehicle Type</InputLabel>
                          <Select
                            name="vehicleType"
                            value={vehicleForm.vehicleType}
                            label="Vehicle Type"
                            onChange={handleVehicleFormChange}
                          >
                            <MenuItem value="truck">🚛 Truck</MenuItem>
                            <MenuItem value="trailer">🚚 Trailer</MenuItem>
                            <MenuItem value="container">📦 Container</MenuItem>
                            <MenuItem value="van">🚐 Van</MenuItem>
                            <MenuItem value="other">🚗 Other</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* Driver Information */}
                <Grid item xs={12}>
                  <Paper elevation={2} sx={{ p: 3, bgcolor: '#f5f5f5' }}>
                    <Typography variant="subtitle1" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Person color="primary" />
                      Driver Information
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          required
                          label="Driver Name"
                          name="driverName"
                          value={vehicleForm.driverName}
                          onChange={handleVehicleFormChange}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Person color="action" />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          required
                          label="Driver Phone"
                          name="driverPhone"
                          value={vehicleForm.driverPhone}
                          onChange={handleVehicleFormChange}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Phone color="action" />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="Driver License (Optional)"
                          name="driverLicense"
                          value={vehicleForm.driverLicense}
                          onChange={handleVehicleFormChange}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Badge color="action" />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* Purpose and Weighing Options */}
                <Grid item xs={12}>
                  <Paper elevation={2} sx={{ p: 3, bgcolor: '#f5f5f5' }}>
                    <Typography variant="subtitle1" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Info color="primary" />
                      Visit Purpose & Weighing Details
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12}>
                        <FormControl component="fieldset" required>
                          <FormLabel component="legend">Purpose of Visit</FormLabel>
                          <RadioGroup
                            row
                            name="visitPurpose"
                            value={vehicleForm.visitPurpose}
                            onChange={handleVehicleFormChange}
                          >
                            <FormControlLabel 
                              value="weighing_only" 
                              control={<Radio />} 
                              label="Weighing Only (Pay & Leave)" 
                            />
                            <FormControlLabel 
                              value="grain_loading" 
                              control={<Radio />} 
                              label="Grain Loading/Unloading" 
                            />
                          </RadioGroup>
                        </FormControl>
                      </Grid>

                      {/* Show weighing options for all visit purposes */}
                      {vehicleForm.visitPurpose && (
                        <>
                          <Grid item xs={12}>
                            <FormControl component="fieldset" required error={!vehicleForm.weighingOption}>
                              <FormLabel component="legend">
                                Vehicle Current Status <span style={{ color: 'red' }}>*</span>
                              </FormLabel>
                              <RadioGroup
                                name="weighingOption"
                                value={vehicleForm.weighingOption}
                                onChange={handleVehicleFormChange}
                              >
                                <FormControlLabel 
                                  value="empty_now" 
                                  control={<Radio />} 
                                  label="Vehicle is EMPTY now (will record empty weight and vehicle can return loaded)" 
                                />
                                <FormControlLabel 
                                  value="loaded_now" 
                                  control={<Radio />} 
                                  label="Vehicle is LOADED now (will weigh loaded vehicle)" 
                                />
                                <FormControlLabel 
                                  value="will_return" 
                                  control={<Radio />} 
                                  label="Vehicle will return later for weighing" 
                                />
                              </RadioGroup>
                              {!vehicleForm.weighingOption && (
                                <FormHelperText error>Please select vehicle status</FormHelperText>
                              )}
                            </FormControl>
                          </Grid>

                          {vehicleForm.weighingOption === 'empty_now' && (
                            <Grid item xs={12} md={6}>
                              <TextField
                                fullWidth
                                required
                                type="number"
                                label="Empty Vehicle Weight (kg)"
                                name="emptyWeight"
                                value={vehicleForm.emptyWeight}
                                onChange={handleVehicleFormChange}
                                InputProps={{
                                  startAdornment: (
                                    <InputAdornment position="start">
                                      <Scale color="action" />
                                    </InputAdornment>
                                  ),
                                  endAdornment: (
                                    <InputAdornment position="end">kg</InputAdornment>
                                  ),
                                }}
                                helperText="Enter the current empty weight of the vehicle"
                              />
                            </Grid>
                          )}

                          {(vehicleForm.weighingOption === 'loaded_now' || vehicleForm.weighingOption === 'will_return') && (
                            <>
                              <Grid item xs={12} md={4}>
                                <TextField
                                  fullWidth
                                  required
                                  type="number"
                                  label="Loaded Vehicle Weight (kg)"
                                  name="loadedWeight"
                                  value={vehicleForm.loadedWeight}
                                  onChange={handleVehicleFormChange}
                                  InputProps={{
                                    startAdornment: (
                                      <InputAdornment position="start">
                                        <Scale color="action" />
                                      </InputAdornment>
                                    ),
                                    endAdornment: (
                                      <InputAdornment position="end">kg</InputAdornment>
                                    ),
                                  }}
                                  helperText="Total weight of loaded vehicle"
                                />
                              </Grid>
                              <Grid item xs={12} md={4}>
                                <TextField
                                  fullWidth
                                  required
                                  type="number"
                                  label="Empty Vehicle Weight (kg)"
                                  name="emptyWeightForLoaded"
                                  value={vehicleForm.emptyWeightForLoaded}
                                  onChange={handleVehicleFormChange}
                                  InputProps={{
                                    startAdornment: (
                                      <InputAdornment position="start">
                                        <Scale color="action" />
                                      </InputAdornment>
                                    ),
                                    endAdornment: (
                                      <InputAdornment position="end">kg</InputAdornment>
                                    ),
                                  }}
                                  helperText="Weight of empty vehicle"
                                />
                              </Grid>
                              <Grid item xs={12} md={4}>
                                <TextField
                                  fullWidth
                                  type="number"
                                  label="Grain Weight (kg)"
                                  name="grainWeight"
                                  value={vehicleForm.grainWeight}
                                  disabled
                                  InputProps={{
                                    startAdornment: (
                                      <InputAdornment position="start">
                                        <Inventory color="action" />
                                      </InputAdornment>
                                    ),
                                    endAdornment: (
                                      <InputAdornment position="end">kg</InputAdornment>
                                    ),
                                  }}
                                  helperText="Automatically calculated"
                                  sx={{
                                    '& .MuiInputBase-input': {
                                      fontWeight: 'bold',
                                      fontSize: '1.1rem',
                                      color: 'primary.main'
                                    }
                                  }}
                                />
                              </Grid>
                            </>
                          )}
                        </>
                      )}
                    </Grid>
                  </Paper>
                </Grid>

                {/* Customer Information */}
                {vehicleForm.visitPurpose && (
                  <Grid item xs={12}>
                    <Paper elevation={2} sx={{ p: 3, bgcolor: '#f5f5f5' }}>
                      <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                        Customer Information {vehicleForm.visitPurpose === 'grain_loading' && <span style={{ color: 'red' }}>*</span>}
                      </Typography>
                      {vehicleForm.visitPurpose === 'grain_loading' && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                          Customer details are required for grain loading/unloading operations
                        </Alert>
                      )}
                      <Divider sx={{ mb: 2 }} />
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            required={vehicleForm.visitPurpose === 'grain_loading'}
                            label="Customer Name"
                            name="customerName"
                            value={vehicleForm.customerName}
                            onChange={handleVehicleFormChange}
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            required={vehicleForm.visitPurpose === 'grain_loading'}
                            label="Customer Phone"
                            name="customerPhone"
                            value={vehicleForm.customerPhone}
                            onChange={handleVehicleFormChange}
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            required={vehicleForm.visitPurpose === 'grain_loading'}
                            label="Customer Email"
                            name="customerEmail"
                            type="email"
                            value={vehicleForm.customerEmail}
                            onChange={handleVehicleFormChange}
                          />
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <Button 
                      type="submit" 
                      variant="contained" 
                      size="large"
                      disabled={loading}
                      startIcon={<CheckCircle />}
                    >
                      {loading ? <CircularProgress size={24} /> : 'Register Vehicle'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
      )}

      {activeTab === 1 && <VehicleList />}

      {/* Payment Dialog */}
      <Dialog 
        open={paymentDialog} 
        onClose={() => setPaymentDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Payment color="primary" />
              <Typography variant="h6">Weighbridge Payment</Typography>
            </Box>
            <IconButton onClick={() => setPaymentDialog(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {registeredVehicle && (
            <Box sx={{ mb: 3 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Vehicle: <strong>{registeredVehicle.vehicleNumber}</strong>
              </Alert>
              
              <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Weighing Fee
                </Typography>
                <Typography variant="h4" color="primary" fontWeight="600">
                  ₹{paymentForm.weighingFee}
                </Typography>
              </Paper>

              <FormControl component="fieldset" fullWidth>
                <FormLabel component="legend">Select Payment Method</FormLabel>
                <RadioGroup
                  name="paymentMethod"
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                >
                  <FormControlLabel 
                    value="cash" 
                    control={<Radio />} 
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <MonetizationOn color="success" />
                        <Typography>Cash Payment</Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel 
                    value="upi" 
                    control={<Radio />} 
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <QrCode color="primary" />
                        <Typography>UPI Payment</Typography>
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setPaymentDialog(false)} variant="outlined">
            Cancel
          </Button>
          <Button 
            onClick={handlePayment} 
            variant="contained" 
            disabled={loading}
            startIcon={paymentForm.paymentMethod === 'cash' ? <CheckCircle /> : <QrCode />}
          >
            {loading ? <CircularProgress size={24} /> : 
             paymentForm.paymentMethod === 'cash' ? 'Payment Received' : 'Generate UPI QR'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* UPI QR Code Dialog */}
      <Dialog 
        open={upiQrDialog} 
        onClose={() => setUpiQrDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <QrCode color="primary" />
            <Typography variant="h6">Scan QR Code for Payment</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 3 }}>
            {upiQrCode && (
              <Box>
                <img src={upiQrCode} alt="UPI QR Code" style={{ maxWidth: '300px', width: '100%' }} />
                <Typography variant="h5" sx={{ mt: 3, mb: 1 }} color="primary" fontWeight="600">
                  ₹{paymentForm.weighingFee}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Scan with any UPI app to pay
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setUpiQrDialog(false)} variant="outlined">
            Cancel
          </Button>
          <Button 
            onClick={confirmUPIPayment} 
            variant="contained" 
            color="success"
            disabled={loading}
            startIcon={<CheckCircle />}
          >
            {loading ? <CircularProgress size={24} /> : 'Payment Done - Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default WeighBridge;
