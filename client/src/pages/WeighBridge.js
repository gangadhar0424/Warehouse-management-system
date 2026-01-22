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
  IconButton
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
  CheckCircle
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import RazorpayPayment from '../components/RazorpayPayment';
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

  // Weight Form
  const [weightForm, setWeightForm] = useState({
    grossWeight: '',
    tareWeight: ''
  });

  // Payment Form - Simplified for weighing fee only
  const [paymentForm, setPaymentForm] = useState({
    weighingFee: 100, // Fixed fee for weighing
    paymentMethod: 'cash'
  });

  const [paymentDialog, setPaymentDialog] = useState(false);
  const [qrCodeDialog, setQrCodeDialog] = useState(false);
  const [qrCodeData, setQrCodeData] = useState('');
  const [razorpayPaymentDialog, setRazorpayPaymentDialog] = useState(false);
  const [registeredVehicle, setRegisteredVehicle] = useState(null); // Store registered vehicle for payment
  const [upiQrCode, setUpiQrCode] = useState(''); // UPI QR code image

  const { user } = useAuth();
  const { addNotification } = useSocket();

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/vehicles');
      setVehicles(response.data.vehicles);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      setError('Failed to fetch vehicles');
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleFormChange = (e) => {
    const { name, value } = e.target;
    
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
      setVehicleForm(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleVehicleEntry = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/vehicles/entry', vehicleForm);
      
      setSuccess('Vehicle entry registered successfully!');
      addNotification({
        type: 'success',
        title: 'Vehicle Entry',
        message: response.data.visitPurpose === 'grain_loading' 
          ? `Vehicle ${vehicleForm.vehicleNumber} added to loading queue`
          : `Vehicle ${vehicleForm.vehicleNumber} entered successfully`,
        timestamp: new Date()
      });

      // Only show payment dialog for weighing_only vehicles
      if (response.data.visitPurpose === 'weighing_only') {
        // Store registered vehicle and show payment dialog
        setRegisteredVehicle(response.data.vehicle);
        setPaymentDialog(true);
      } else {
        // For grain_loading, just show success message
        setSuccess('Vehicle added to loading queue successfully! You can find it in the Vehicle Management module.');
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
        capacity: { weight: '', volume: '' },
        cargo: { description: '', quantity: '', unit: 'kg' }
      });

      fetchVehicles();
      
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to register vehicle entry');
    } finally {
      setLoading(false);
    }
  };

  const handleWeighVehicle = async (vehicleId) => {
    if (!weightForm.grossWeight || !weightForm.tareWeight) {
      setError('Please enter both gross and tare weight');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.put(`/api/vehicles/${vehicleId}/weigh`, weightForm);
      
      setSuccess('Vehicle weighed successfully!');
      addNotification({
        type: 'success',
        title: 'Vehicle Weighed',
        message: `Vehicle weighed - Net weight: ${weightForm.grossWeight - weightForm.tareWeight} kg`,
        timestamp: new Date()
      });

      setWeightForm({ grossWeight: '', tareWeight: '' });
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
      const totalAmount = 130; // Fixed weighbridge fee

      // If UPI selected, generate QR code
      if (paymentForm.paymentMethod === 'upi') {
        await generateUPIQRCode(totalAmount);
        return; // Wait for user to scan and confirm
      }

      // For cash, create transaction immediately
      await createWeighbridgeTransaction(totalAmount, 'cash');
      
    } catch (error) {
      console.error('Payment error:', error);
      setError(error.response?.data?.message || 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  const generateUPIQRCode = async (amount) => {
    try {
      // Create UPI payment string (standard UPI format)
      const upiString = `upi://pay?pa=warehouse@upi&pn=Warehouse Management&am=${amount}&cu=INR&tn=Weighbridge Fee - Vehicle ${registeredVehicle.vehicleNumber}`;
      
      // Request QR code from backend
      const response = await axios.post('/api/payments/generate-upi-qr', {
        upiString,
        amount,
        vehicleNumber: registeredVehicle.vehicleNumber
      });

      setUpiQrCode(response.data.qrCode);
      setQrCodeDialog(true);
      setLoading(false);
      
    } catch (error) {
      console.error('QR generation error:', error);
      setError('Failed to generate UPI QR code');
      setLoading(false);
    }
  };

  const confirmUPIPayment = async () => {
    setLoading(true);
    try {
      await createWeighbridgeTransaction(130, 'upi');
      setQrCodeDialog(false);
    } catch (error) {
      setError('Failed to confirm payment');
    } finally {
      setLoading(false);
    }
  };

  const createWeighbridgeTransaction = async (amount, paymentMethod) => {
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

      setSuccess(`Payment of ₹${amount} processed successfully!`);
      setPaymentDialog(false);
      
      // Notify via socket for real-time update
      addNotification({
        type: 'success',
        title: 'Payment Received',
        message: `Weighbridge payment of ₹${amount} received for vehicle ${registeredVehicle.vehicleNumber}`,
        timestamp: new Date()
      });

      // Reset
      setRegisteredVehicle(null);
      setUpiQrCode('');
      await fetchVehicles();
      
    } catch (error) {
      console.error('Transaction creation error:', error);
      throw error;
    }
  };

  const handlePaymentOld = async () => {
    if (!selectedVehicle) return;

    setLoading(true);
    setError('');
    
    try {
      const totalAmount = parseFloat(paymentForm.weighingFee) || 100;

      // Create payment transaction
      const paymentData = {
        type: 'vehicle_weighing',
        customer: selectedVehicle.customer?._id || selectedVehicle.customer || null,
        vehicle: selectedVehicle._id,
        amount: {
          baseAmount: totalAmount,
          totalAmount: totalAmount
        },
        payment: {
          method: paymentForm.paymentMethod,
          status: 'completed'
        },
        description: `Weigh bridge charges for vehicle ${selectedVehicle.vehicleNumber}`,
        items: [{
          description: 'Weighing Fee',
          quantity: 1,
          unitPrice: totalAmount,
          totalPrice: totalAmount
        }]
      };

      const response = await axios.post('/api/payments/create', paymentData);

      // Mark payment as completed for cash/UPI
      if (paymentForm.paymentMethod === 'cash' || paymentForm.paymentMethod === 'upi') {
        await axios.post(`/api/payments/${response.data.transaction._id}/process`, {
          gatewayTransactionId: `${paymentForm.paymentMethod.toUpperCase()}_${Date.now()}`,
          gatewayResponse: { 
            method: paymentForm.paymentMethod, 
            processedBy: user.id,
            timestamp: new Date().toISOString()
          }
        });

        // Update vehicle payment status
        await axios.put(`/api/vehicles/${selectedVehicle._id}`, {
          paymentStatus: 'paid',
          paymentAmount: totalAmount,
          paymentMethod: paymentForm.paymentMethod,
          paymentDate: new Date()
        });
      }

      setSuccess(`Payment of ₹${totalAmount} processed successfully!`);
      setPaymentDialog(false);
      
      // Generate bill automatically
      await generateBill(selectedVehicle, response.data.transaction);
      
      // Refresh vehicle list
      await fetchVehicles();
      
      addNotification({
        type: 'success',
        title: 'Payment Processed',
        message: `Payment of ₹${totalAmount} received for vehicle ${selectedVehicle.vehicleNumber}`
      });
      
    } catch (error) {
      console.error('Payment error:', error);
      setError(error.response?.data?.message || 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  const generateBill = async (vehicle, transaction) => {
    try {
      const billData = {
        vehicleNumber: vehicle.vehicleNumber,
        vehicleType: vehicle.vehicleType,
        customerName: vehicle.driver?.name || 'N/A',
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        grossWeight: vehicle.grossWeight || 0,
        tareWeight: vehicle.tareWeight || 0,
        netWeight: (vehicle.grossWeight || 0) - (vehicle.tareWeight || 0),
        amount: transaction?.amount?.totalAmount || paymentForm.weighingFee || 100,
        paymentMethod: transaction?.payment?.method || paymentForm.paymentMethod,
        transactionId: transaction?._id || 'N/A'
      };

      // In a real app, you would send this to backend to generate PDF
      // For now, just show success message
      setSuccess(`Bill generated for vehicle ${vehicle.vehicleNumber}`);
      
      // You could also trigger a download here
      console.log('Bill Data:', billData);
      
    } catch (error) {
      console.error('Bill generation error:', error);
      setError('Failed to generate bill');
    }
  };

  const handleRazorpayPaymentSuccess = (paymentData) => {
    setSuccess(`Payment processed successfully! Payment ID: ${paymentData.paymentId}`);
    setRazorpayPaymentDialog(false);
    setPaymentDialog(false);
    fetchVehicles();
    
    addNotification({
      type: 'success',
      title: 'Payment Successful',
      message: `Payment of ₹${getTotalAmount()} completed via ${paymentData.method.toUpperCase()}`,
      timestamp: new Date()
    });
  };

  const handleRazorpayPaymentError = (error) => {
    setError(`Payment failed: ${error.message || 'Unknown error'}`);
    
    addNotification({
      type: 'error',
      title: 'Payment Failed',
      message: 'Payment could not be processed. Please try again.',
      timestamp: new Date()
    });
  };

  const getTotalAmount = () => {
    return (parseFloat(paymentForm.weighBridgeCharge) || 0) +
           (parseFloat(paymentForm.storageCharge) || 0) +
           (parseFloat(paymentForm.loadingCharge) || 0) +
           (parseFloat(paymentForm.otherCharges) || 0);
  };

  const VehicleList = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Current Vehicles in Warehouse
        </Typography>
        
        {loading && <CircularProgress />}
        
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {vehicles.filter(v => v.status !== 'exited').map((vehicle) => (
            <Grid item xs={12} md={6} lg={4} key={vehicle._id}>
              <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6">{vehicle.vehicleNumber}</Typography>
                  <Chip 
                    label={vehicle.status} 
                    color={vehicle.status === 'entered' ? 'primary' : 'success'}
                    size="small"
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary">
                  Driver: {vehicle.driverName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Type: {vehicle.vehicleType}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Entry: {new Date(vehicle.entryTime).toLocaleString()}
                </Typography>
                
                {vehicle.weighBridgeData && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2">
                      Net Weight: {vehicle.weighBridgeData.netWeight} kg
                    </Typography>
                  </Box>
                )}

                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {vehicle.status === 'entered' && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Scale />}
                      onClick={() => setSelectedVehicle(vehicle)}
                    >
                      Weigh
                    </Button>
                  )}
                  
                  {vehicle.status === 'weighed' && (
                    <>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Payment />}
                        onClick={() => {
                          setSelectedVehicle(vehicle);
                          setPaymentDialog(true);
                        }}
                      >
                        Payment
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Receipt />}
                        onClick={() => generateBill(vehicle)}
                      >
                        Bill
                      </Button>
                    </>
                  )}
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Weigh Bridge Module
      </Typography>

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
          <Tab label="Vehicle Entry" />
          <Tab label="Current Vehicles" />
        </Tabs>
      </Box>

      {activeTab === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <LocalShipping sx={{ mr: 1, verticalAlign: 'middle' }} />
              Vehicle Entry Registration
            </Typography>
            
            <Box component="form" onSubmit={handleVehicleEntry} sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                {/* Vehicle Type */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Vehicle Type</InputLabel>
                    <Select
                      name="vehicleType"
                      value={vehicleForm.vehicleType}
                      label="Vehicle Type"
                      onChange={handleVehicleFormChange}
                    >
                      <MenuItem value="truck">Truck</MenuItem>
                      <MenuItem value="trailer">Trailer</MenuItem>
                      <MenuItem value="container">Container</MenuItem>
                      <MenuItem value="van">Van</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Vehicle Number */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="Vehicle Number"
                    name="vehicleNumber"
                    value={vehicleForm.vehicleNumber}
                    onChange={handleVehicleFormChange}
                    placeholder="e.g., AP09AB1234"
                    inputProps={{ style: { textTransform: 'uppercase' } }}
                  />
                </Grid>

                {/* Purpose of Visit */}
                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>Purpose of Visit</InputLabel>
                    <Select
                      name="visitPurpose"
                      value={vehicleForm.visitPurpose}
                      label="Purpose of Visit"
                      onChange={handleVehicleFormChange}
                    >
                      <MenuItem value="" disabled>
                        <em>Select from list</em>
                      </MenuItem>
                      <MenuItem value="weighing_only">Weighing Only (Check Weight)</MenuItem>
                      <MenuItem value="grain_loading">Grain Loading/Unloading</MenuItem>
                    </Select>
                  </FormControl>
                  {vehicleForm.visitPurpose && (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      {vehicleForm.visitPurpose === 'weighing_only' 
                        ? '💡 After weighing & payment, vehicle details will be recorded only.'
                        : '💡 Vehicle will be added to the Vehicle Management module for loading/unloading operations.'}
                    </Alert>
                  )}
                </Grid>

                {/* Driver Details Section */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }}>
                    <Chip label="Driver Details" color="primary" />
                  </Divider>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    required
                    label="Driver Name"
                    name="driverName"
                    value={vehicleForm.driverName}
                    onChange={handleVehicleFormChange}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    required
                    label="Driver Phone"
                    name="driverPhone"
                    value={vehicleForm.driverPhone}
                    onChange={handleVehicleFormChange}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Driver License"
                    name="driverLicense"
                    value={vehicleForm.driverLicense}
                    onChange={handleVehicleFormChange}
                  />
                </Grid>

                {/* Customer Information Section */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }}>
                    <Chip label="Customer Information" color="primary" />
                  </Divider>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    required
                    label="Customer Name"
                    name="customerName"
                    value={vehicleForm.customerName}
                    onChange={handleVehicleFormChange}
                    placeholder="Full name of customer"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    required
                    label="Customer Phone Number"
                    name="customerPhone"
                    value={vehicleForm.customerPhone}
                    onChange={handleVehicleFormChange}
                    placeholder="10-digit phone number"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    required
                    label="Customer Email Address"
                    name="customerEmail"
                    type="email"
                    value={vehicleForm.customerEmail}
                    onChange={handleVehicleFormChange}
                    placeholder="customer@example.com"
                  />
                </Grid>

                {/* Cargo Details Section */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }}>
                    <Chip label="Cargo Details" color="primary" />
                  </Divider>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Vehicle Capacity (quintals)"
                    name="capacity.weight"
                    type="number"
                    value={vehicleForm.capacity.weight}
                    onChange={handleVehicleFormChange}
                    placeholder="e.g., 100"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Cargo Description"
                    name="cargo.description"
                    value={vehicleForm.cargo.description}
                    onChange={handleVehicleFormChange}
                    placeholder="e.g., Rice, Wheat"
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <TextField
                    fullWidth
                    label="Quantity"
                    name="cargo.quantity"
                    type="number"
                    value={vehicleForm.cargo.quantity}
                    onChange={handleVehicleFormChange}
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <FormControl fullWidth>
                    <InputLabel>Unit</InputLabel>
                    <Select
                      name="cargo.unit"
                      value={vehicleForm.cargo.unit}
                      label="Unit"
                      onChange={handleVehicleFormChange}
                    >
                      <MenuItem value="kg">Kg</MenuItem>
                      <MenuItem value="tons">Tons</MenuItem>
                      <MenuItem value="bags">Bags</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    startIcon={loading ? <CircularProgress size={20} /> : <LocalShipping />}
                    disabled={loading}
                  >
                    {loading ? 'Registering...' : 'Register Vehicle Entry'}
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
      )}
      {activeTab === 1 && <VehicleList />}

      {/* Weight Dialog */}
      <Dialog open={Boolean(selectedVehicle)} onClose={() => setSelectedVehicle(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Weigh Vehicle - {selectedVehicle?.vehicleNumber}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              {/* Weight Explanation Section */}
              <Grid item xs={12}>
                <Paper sx={{ p: 2, bgcolor: 'info.light', mb: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    📏 Weight Measurement Guide
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>🚛 Gross Weight:</strong> Total weight of the vehicle when loaded with grain
                        (Vehicle + Grain + Driver + Fuel)
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>⚖️ Tare Weight:</strong> Weight of the empty vehicle only
                        (Vehicle + Driver + Fuel, but NO grain)
                      </Typography>
                    </Grid>
                  </Grid>
                  <Typography variant="body2" color="success.main" sx={{ mt: 1, fontWeight: 'bold' }}>
                    💡 Net Weight = Gross Weight - Tare Weight (This is the actual grain weight)
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Tooltip title="Total weight including vehicle, grain, driver, and fuel" placement="top">
                  <TextField
                    fullWidth
                    label="Gross Weight (kg)"
                    type="number"
                    value={weightForm.grossWeight}
                    onChange={(e) => setWeightForm(prev => ({ ...prev, grossWeight: e.target.value }))}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <Tooltip title="This is the total weight when the vehicle is loaded with grain">
                            <IconButton size="small">
                              <Info fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </InputAdornment>
                      )
                    }}
                    helperText="Weight of loaded vehicle (vehicle + grain + driver + fuel)"
                  />
                </Tooltip>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Tooltip title="Weight of empty vehicle without grain" placement="top">
                  <TextField
                    fullWidth
                    label="Tare Weight (kg)"
                    type="number"
                    value={weightForm.tareWeight}
                    onChange={(e) => setWeightForm(prev => ({ ...prev, tareWeight: e.target.value }))}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <Tooltip title="This is the weight of the empty vehicle without any grain">
                            <IconButton size="small">
                              <Info fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </InputAdornment>
                      )
                    }}
                    helperText="Weight of empty vehicle (vehicle + driver + fuel, NO grain)"
                  />
                </Tooltip>
              </Grid>
              {weightForm.grossWeight && weightForm.tareWeight && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 3, bgcolor: 'success.light', border: '2px solid', borderColor: 'success.main' }}>
                    <Box display="flex" alignItems="center" justifyContent="center" gap={2}>
                      <Scale sx={{ fontSize: 40, color: 'success.dark' }} />
                      <Box textAlign="center">
                        <Typography variant="h4" color="success.dark" fontWeight="bold">
                          {(parseFloat(weightForm.grossWeight) - parseFloat(weightForm.tareWeight)).toFixed(2)} kg
                        </Typography>
                        <Typography variant="h6" color="success.dark">
                          🌾 Net Grain Weight
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          ({parseFloat(weightForm.grossWeight).toFixed(2)} kg - {parseFloat(weightForm.tareWeight).toFixed(2)} kg)
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedVehicle(null)}>Cancel</Button>
          <Button 
            onClick={() => handleWeighVehicle(selectedVehicle?._id)}
            variant="contained"
            disabled={loading}
          >
            Save Weight
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialog} onClose={() => setPaymentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Payment color="primary" />
          Weighbridge Payment - {registeredVehicle?.vehicleNumber}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Paper sx={{ p: 3, mb: 3, bgcolor: 'primary.light', color: 'white' }}>
              <Typography variant="h4" align="center" sx={{ fontWeight: 'bold' }}>
                ₹130
              </Typography>
              <Typography variant="body2" align="center" sx={{ mt: 1 }}>
                Weighbridge Fee
              </Typography>
            </Paper>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                  Select Payment Method:
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Paper
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    cursor: 'pointer',
                    border: paymentForm.paymentMethod === 'cash' ? 3 : 1,
                    borderColor: paymentForm.paymentMethod === 'cash' ? 'primary.main' : 'divider',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  onClick={() => setPaymentForm(prev => ({ ...prev, paymentMethod: 'cash' }))}
                >
                  <MonetizationOn sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                  <Typography variant="h6">Cash</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Pay in cash
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={6}>
                <Paper
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    cursor: 'pointer',
                    border: paymentForm.paymentMethod === 'upi' ? 3 : 1,
                    borderColor: paymentForm.paymentMethod === 'upi' ? 'primary.main' : 'divider',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  onClick={() => setPaymentForm(prev => ({ ...prev, paymentMethod: 'upi' }))}
                >
                  <QrCode sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                  <Typography variant="h6">UPI</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Scan QR code
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Alert severity="info" sx={{ mt: 2 }}>
                  {paymentForm.paymentMethod === 'cash' 
                    ? 'Click "Process Payment" to confirm cash payment received. Vehicle details will be recorded.'
                    : 'Click "Generate QR" to generate UPI payment QR code. After payment, vehicle details will be recorded.'}
                </Alert>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setPaymentDialog(false); setRegisteredVehicle(null); }}>
            Cancel
          </Button>
          <Button 
            onClick={handlePayment} 
            variant="contained" 
            disabled={loading}
            startIcon={paymentForm.paymentMethod === 'upi' ? <QrCode /> : <Payment />}
          >
            {loading ? <CircularProgress size={24} /> : 
              paymentForm.paymentMethod === 'upi' ? 'Generate QR Code' : 'Confirm Payment Received'
            }
          </Button>
        </DialogActions>
      </Dialog>

      {/* UPI QR Code Dialog */}
      <Dialog open={qrCodeDialog} onClose={() => setQrCodeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ textAlign: 'center', bgcolor: 'primary.main', color: 'white' }}>
          <QrCode sx={{ fontSize: 40, mb: 1 }} />
          <Typography variant="h6">UPI Payment QR Code</Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Paper elevation={3} sx={{ p: 3, mb: 3, bgcolor: '#f5f5f5' }}>
              {upiQrCode ? (
                <img 
                  src={upiQrCode} 
                  alt="UPI QR Code" 
                  style={{ width: '300px', height: '300px', margin: '0 auto', display: 'block' }}
                />
              ) : (
                <CircularProgress size={60} />
              )}
            </Paper>

            <Paper sx={{ p: 2, mb: 2, bgcolor: 'info.light' }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                ₹130
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Weighbridge Fee
              </Typography>
            </Paper>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Vehicle: <strong>{registeredVehicle?.vehicleNumber}</strong>
            </Typography>

            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                1. Scan the QR code with any UPI app<br />
                2. Complete the payment of ₹130<br />
                3. Click "Payment Successful" below after completion
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', p: 2 }}>
          <Button onClick={() => { setQrCodeDialog(false); setUpiQrCode(''); }} color="error">
            Cancel
          </Button>
          <Button 
            onClick={confirmUPIPayment} 
            variant="contained" 
            color="success"
            disabled={loading}
            startIcon={<CheckCircle />}
          >
            {loading ? <CircularProgress size={24} /> : 'Payment Successful'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Old QR Code Dialog */}
      <Dialog open={false} onClose={() => setQrCodeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>UPI Payment</DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Scan QR Code to Pay
            </Typography>
            {qrCodeData && (
              <img src={qrCodeData} alt="UPI QR Code" style={{ maxWidth: '300px', width: '100%' }} />
            )}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Amount: ₹{getTotalAmount().toFixed(2)}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrCodeDialog(false)} variant="contained">
            Payment Completed
          </Button>
        </DialogActions>
      </Dialog>

      {/* Razorpay Payment Dialog */}
      <Dialog 
        open={razorpayPaymentDialog} 
        onClose={() => setRazorpayPaymentDialog(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>Secure Payment - {selectedVehicle?.vehicleNumber}</DialogTitle>
        <DialogContent>
          <RazorpayPayment
            amount={getTotalAmount()}
            onSuccess={handleRazorpayPaymentSuccess}
            onError={handleRazorpayPaymentError}
            paymentData={{
              type: 'weigh_bridge',
              vehicle: selectedVehicle?._id,
              transactionId: selectedVehicle?.transactionId,
              customerName: selectedVehicle?.driverName,
              customerEmail: selectedVehicle?.driverEmail,
              customerPhone: selectedVehicle?.driverPhone,
              description: `Weigh bridge charges for vehicle ${selectedVehicle?.vehicleNumber}`
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRazorpayPaymentDialog(false)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default WeighBridge;