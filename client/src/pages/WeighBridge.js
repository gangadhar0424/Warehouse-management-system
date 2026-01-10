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
  Info
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
    ownerName: '',
    ownerPhone: '',
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
        message: `Vehicle ${vehicleForm.vehicleNumber} entered successfully`,
        timestamp: new Date()
      });

      // Reset form
      setVehicleForm({
        vehicleNumber: '',
        vehicleType: 'truck',
        driverName: '',
        driverPhone: '',
        driverLicense: '',
        ownerName: '',
        ownerPhone: '',
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

  const VehicleEntryForm = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <LocalShipping sx={{ mr: 1, verticalAlign: 'middle' }} />
          Vehicle Entry Registration
        </Typography>
        
        <Box component="form" onSubmit={handleVehicleEntry} sx={{ mt: 2 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Vehicle Number"
                name="vehicleNumber"
                value={vehicleForm.vehicleNumber}
                onChange={handleVehicleFormChange}
                placeholder="e.g., AP09AB1234"
              />
            </Grid>
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
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Driver Name"
                name="driverName"
                value={vehicleForm.driverName}
                onChange={handleVehicleFormChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Driver Phone"
                name="driverPhone"
                value={vehicleForm.driverPhone}
                onChange={handleVehicleFormChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Driver License"
                name="driverLicense"
                value={vehicleForm.driverLicense}
                onChange={handleVehicleFormChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Owner Name"
                name="ownerName"
                value={vehicleForm.ownerName}
                onChange={handleVehicleFormChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Owner Phone"
                name="ownerPhone"
                value={vehicleForm.ownerPhone}
                onChange={handleVehicleFormChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Vehicle Capacity (tons)"
                name="capacity.weight"
                type="number"
                value={vehicleForm.capacity.weight}
                onChange={handleVehicleFormChange}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>Cargo Details</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Cargo Description"
                name="cargo.description"
                value={vehicleForm.cargo.description}
                onChange={handleVehicleFormChange}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Quantity"
                name="cargo.quantity"
                type="number"
                value={vehicleForm.cargo.quantity}
                onChange={handleVehicleFormChange}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
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
                  <MenuItem value="pieces">Pieces</MenuItem>
                  <MenuItem value="boxes">Boxes</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <LocalShipping />}
              >
                Register Vehicle Entry
              </Button>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );

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

      {activeTab === 0 && <VehicleEntryForm />}
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
        <DialogTitle>Payment - {selectedVehicle?.vehicleNumber}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Weigh Bridge Charge (₹)"
                  type="number"
                  value={paymentForm.weighBridgeCharge}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, weighBridgeCharge: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Storage Charge (₹)"
                  type="number"
                  value={paymentForm.storageCharge}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, storageCharge: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Loading Charge (₹)"
                  type="number"
                  value={paymentForm.loadingCharge}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, loadingCharge: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Other Charges (₹)"
                  type="number"
                  value={paymentForm.otherCharges}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, otherCharges: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <Paper sx={{ p: 2, bgcolor: 'info.light' }}>
                  <Typography variant="h6">
                    Total Amount: ₹{(
                      (parseFloat(paymentForm.weighBridgeCharge) || 0) +
                      (parseFloat(paymentForm.storageCharge) || 0) +
                      (parseFloat(paymentForm.loadingCharge) || 0) +
                      (parseFloat(paymentForm.otherCharges) || 0)
                    ).toFixed(2)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    value={paymentForm.paymentMethod}
                    label="Payment Method"
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  >
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="upi">UPI</MenuItem>
                    <MenuItem value="card">Card</MenuItem>
                    <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialog(false)}>Cancel</Button>
          <Button onClick={handlePayment} variant="contained" disabled={loading}>
            Process Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrCodeDialog} onClose={() => setQrCodeDialog(false)} maxWidth="sm" fullWidth>
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