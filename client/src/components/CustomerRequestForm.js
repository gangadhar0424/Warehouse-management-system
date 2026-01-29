import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Send,
  CheckCircle,
  Cancel,
  Pending,
  Warehouse,
  AccountBalance,
  Info
} from '@mui/icons-material';
import axios from 'axios';

const CustomerRequestForm = () => {
  const [requestType, setRequestType] = useState('');
  const [message, setMessage] = useState('');
  const [myAllocations, setMyAllocations] = useState([]);
  const [selectedAllocation, setSelectedAllocation] = useState(null);
  const [loanAmount, setLoanAmount] = useState('');
  const [loanPurpose, setLoanPurpose] = useState('');
  const [loanDuration, setLoanDuration] = useState('');
  const [collateral, setCollateral] = useState('');
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    fetchMyAllocations();
    fetchMyRequests();
  }, []);

  const fetchMyAllocations = async () => {
    try {
      const response = await axios.get('/api/dynamic-warehouse/my-grain-locations');
      setMyAllocations(response.data.locations || []);
    } catch (error) {
      console.error('Error fetching allocations:', error);
    }
  };

  const fetchMyRequests = async () => {
    try {
      const response = await axios.get('/api/requests/my-requests');
      setMyRequests(response.data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  const handleSubmitRequest = async () => {
    try {
      setLoading(true);
      setError('');

      if (!requestType) {
        setError('Please select a request type');
        return;
      }

      if (!message.trim()) {
        setError('Please enter a message');
        return;
      }

      const requestData = {
        type: requestType,
        message
      };

      if (requestType === 'vacate_warehouse') {
        if (!selectedAllocation) {
          setError('Please select an allocation to vacate');
          return;
        }

        requestData.allocationDetails = {
          building: selectedAllocation.building,
          block: selectedAllocation.block,
          slotLabel: selectedAllocation.slotLabel,
          grainType: selectedAllocation.grainType,
          bags: selectedAllocation.bags
        };
      } else if (requestType === 'loan_approval') {
        if (!loanAmount || !loanPurpose || !loanDuration) {
          setError('Please fill all loan details');
          return;
        }

        requestData.loanDetails = {
          requestedAmount: parseFloat(loanAmount),
          purpose: loanPurpose,
          duration: parseInt(loanDuration),
          collateral
        };
      }

      await axios.post('/api/requests', requestData);

      setSuccess('Request submitted successfully!');
      setRequestType('');
      setMessage('');
      setSelectedAllocation(null);
      setLoanAmount('');
      setLoanPurpose('');
      setLoanDuration('');
      setCollateral('');
      
      fetchMyRequests();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Pending />;
      case 'approved': return <CheckCircle />;
      case 'rejected': return <Cancel />;
      default: return null;
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Send color="primary" />
          Submit Request to Owner
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Request Type</InputLabel>
              <Select
                value={requestType}
                label="Request Type"
                onChange={(e) => {
                  setRequestType(e.target.value);
                  setSelectedAllocation(null);
                }}
              >
                <MenuItem value="vacate_warehouse">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Warehouse fontSize="small" />
                    Vacate Warehouse
                  </Box>
                </MenuItem>
                <MenuItem value="loan_approval">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccountBalance fontSize="small" />
                    Loan Approval
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {requestType === 'vacate_warehouse' && (
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Select Allocation to Vacate</InputLabel>
                <Select
                  value={selectedAllocation?.slotLabel || ''}
                  label="Select Allocation to Vacate"
                  onChange={(e) => {
                    const allocation = myAllocations.find(a => a.slotLabel === e.target.value);
                    setSelectedAllocation(allocation);
                  }}
                >
                  {myAllocations.map((allocation, index) => (
                    <MenuItem key={index} value={allocation.slotLabel}>
                      {allocation.building} - {allocation.block} - {allocation.slotLabel} 
                      ({allocation.grainType}, {allocation.bags} bags)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          {requestType === 'loan_approval' && (
            <>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Requested Amount (₹)"
                  type="number"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Duration (months)"
                  type="number"
                  value={loanDuration}
                  onChange={(e) => setLoanDuration(e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Purpose of Loan"
                  multiline
                  rows={2}
                  value={loanPurpose}
                  onChange={(e) => setLoanPurpose(e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Collateral (Optional)"
                  value={collateral}
                  onChange={(e) => setCollateral(e.target.value)}
                />
              </Grid>
            </>
          )}

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Message to Owner"
              multiline
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Explain your request in detail..."
            />
          </Grid>

          <Grid item xs={12}>
            <Button
              variant="contained"
              startIcon={<Send />}
              onClick={handleSubmitRequest}
              disabled={loading || !requestType}
              fullWidth
            >
              Submit Request
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          My Request History
        </Typography>

        {myRequests.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Info sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography color="text.secondary">
              No requests submitted yet
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Details</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Submitted</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {myRequests.map((request) => (
                  <TableRow key={request._id}>
                    <TableCell>
                      <Chip
                        icon={request.type === 'vacate_warehouse' ? <Warehouse /> : <AccountBalance />}
                        label={request.type.replace('_', ' ').toUpperCase()}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {request.type === 'vacate_warehouse' && request.allocationDetails && (
                        <Typography variant="body2">
                          {request.allocationDetails.building} - {request.allocationDetails.block} - {request.allocationDetails.slotLabel}
                        </Typography>
                      )}
                      {request.type === 'loan_approval' && request.loanDetails && (
                        <Typography variant="body2">
                          ₹{request.loanDetails.requestedAmount} for {request.loanDetails.duration} months
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(request.status)}
                        label={request.status.toUpperCase()}
                        color={getStatusColor(request.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(request.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedRequest(request);
                            setDetailsDialog(true);
                          }}
                        >
                          <Info />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Request Details Dialog */}
      <Dialog open={detailsDialog} onClose={() => setDetailsDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Details</DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary">Type</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {selectedRequest.type.replace('_', ' ').toUpperCase()}
              </Typography>

              <Typography variant="subtitle2" color="text.secondary">Status</Typography>
              <Chip
                icon={getStatusIcon(selectedRequest.status)}
                label={selectedRequest.status.toUpperCase()}
                color={getStatusColor(selectedRequest.status)}
                size="small"
                sx={{ mb: 2 }}
              />

              <Typography variant="subtitle2" color="text.secondary">Message</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {selectedRequest.message}
              </Typography>

              {selectedRequest.rejectionReason && (
                <>
                  <Typography variant="subtitle2" color="error">Rejection Reason</Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {selectedRequest.rejectionReason}
                  </Typography>
                </>
              )}

              {selectedRequest.createdLoan && (
                <>
                  <Typography variant="subtitle2" color="success.main">Loan Created</Typography>
                  <Typography variant="body1">
                    Amount: ₹{selectedRequest.createdLoan.amount}
                  </Typography>
                  <Typography variant="body1">
                    Interest Rate: {selectedRequest.createdLoan.interestRate}%
                  </Typography>
                  <Typography variant="body1">
                    Duration: {selectedRequest.createdLoan.duration} months
                  </Typography>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerRequestForm;
