import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  Grid,
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
  Tooltip,
  Badge,
  Tabs,
  Tab,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Pending,
  Warehouse,
  AccountBalance,
  Info,
  Notifications
} from '@mui/icons-material';
import axios from 'axios';

const OwnerRequestManagement = () => {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Dialogs
  const [processDialog, setProcessDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Loan details for approval
  const [loanAmount, setLoanAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [duration, setDuration] = useState('');
  const [loanCollateral, setLoanCollateral] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [activeTab, requests]);

  const fetchRequests = async () => {
    try {
      const response = await axios.get('/api/requests/all');
      setRequests(response.data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      setError('Failed to fetch requests');
    }
  };

  const filterRequests = () => {
    if (activeTab === 'all') {
      setFilteredRequests(requests);
    } else {
      setFilteredRequests(requests.filter(r => r.status === activeTab));
    }
  };

  const handleApprove = async () => {
    try {
      setLoading(true);
      setError('');

      const payload = { action: 'approve' };

      // If it's a loan request, include loan details
      if (selectedRequest.type === 'loan_approval') {
        if (!loanAmount || !interestRate || !duration) {
          setError('Please fill all loan details');
          setLoading(false);
          return;
        }

        const monthlyEMI = (parseFloat(loanAmount) * (1 + parseFloat(interestRate) / 100)) / parseInt(duration);

        payload.loanData = {
          amount: parseFloat(loanAmount),
          interestRate: parseFloat(interestRate),
          duration: parseInt(duration),
          collateral: loanCollateral || selectedRequest.loanDetails?.collateral,
          monthlyEMI: monthlyEMI.toFixed(2)
        };
      }

      await axios.put(`/api/requests/${selectedRequest._id}/process`, payload);

      setSuccess('Request approved successfully!');
      setProcessDialog(false);
      resetForm();
      fetchRequests();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to approve request');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      setLoading(true);
      setError('');

      if (!rejectionReason.trim()) {
        setError('Please provide a rejection reason');
        setLoading(false);
        return;
      }

      await axios.put(`/api/requests/${selectedRequest._id}/process`, {
        action: 'reject',
        rejectionReason
      });

      setSuccess('Request rejected');
      setProcessDialog(false);
      resetForm();
      fetchRequests();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to reject request');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedRequest(null);
    setRejectionReason('');
    setLoanAmount('');
    setInterestRate('');
    setDuration('');
    setLoanCollateral('');
  };

  const openProcessDialog = (request) => {
    setSelectedRequest(request);
    if (request.type === 'loan_approval' && request.loanDetails) {
      setLoanAmount(request.loanDetails.requestedAmount?.toString() || '');
      setDuration(request.loanDetails.duration?.toString() || '');
      setLoanCollateral(request.loanDetails.collateral || '');
    }
    setProcessDialog(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <Box>
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

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Badge badgeContent={pendingCount} color="error">
              <Notifications sx={{ fontSize: 40 }} color="primary" />
            </Badge>
            <Box>
              <Typography variant="h5">Customer Requests</Typography>
              <Typography color="text.secondary">
                {pendingCount} pending request{pendingCount !== 1 ? 's' : ''}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Paper sx={{ p: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab 
              label={
                <Badge badgeContent={pendingCount} color="error">
                  Pending
                </Badge>
              } 
              value="pending" 
            />
            <Tab label="Approved" value="approved" />
            <Tab label="Rejected" value="rejected" />
            <Tab label="All" value="all" />
          </Tabs>
        </Box>

        {filteredRequests.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Info sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography color="text.secondary">
              No {activeTab !== 'all' ? activeTab : ''} requests found
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Customer</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Details</TableCell>
                  <TableCell>Message</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request._id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {request.customer?.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {request.customer?.phone}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={request.type === 'vacate_warehouse' ? <Warehouse /> : <AccountBalance />}
                        label={request.type.replace('_', ' ')}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {request.type === 'vacate_warehouse' && request.allocationDetails && (
                        <Box>
                          <Typography variant="body2">
                            {request.allocationDetails.building} - {request.allocationDetails.block}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {request.allocationDetails.slotLabel} ({request.allocationDetails.bags} bags of {request.allocationDetails.grainType})
                          </Typography>
                        </Box>
                      )}
                      {request.type === 'loan_approval' && request.loanDetails && (
                        <Box>
                          <Typography variant="body2">
                            ₹{request.loanDetails.requestedAmount?.toLocaleString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {request.loanDetails.duration} months - {request.loanDetails.purpose}
                          </Typography>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>
                      <Typography variant="body2" noWrap>
                        {request.message}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={request.status}
                        color={getStatusColor(request.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(request.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {request.status === 'pending' ? (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => openProcessDialog(request)}
                        >
                          Process
                        </Button>
                      ) : (
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedRequest(request);
                              setProcessDialog(true);
                            }}
                          >
                            <Info />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Process Request Dialog */}
      <Dialog 
        open={processDialog} 
        onClose={() => {
          setProcessDialog(false);
          resetForm();
        }} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          {selectedRequest?.status === 'pending' ? 'Process Request' : 'Request Details'}
        </DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Customer</Typography>
                  <Typography variant="body1">{selectedRequest.customer?.name}</Typography>
                  <Typography variant="caption">{selectedRequest.customer?.email}</Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Request Type</Typography>
                  <Chip
                    icon={selectedRequest.type === 'vacate_warehouse' ? <Warehouse /> : <AccountBalance />}
                    label={selectedRequest.type.replace('_', ' ')}
                    size="small"
                  />
                </Grid>

                <Grid item xs={12}>
                  <Divider />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Message</Typography>
                  <Typography variant="body1">{selectedRequest.message}</Typography>
                </Grid>

                {selectedRequest.type === 'vacate_warehouse' && selectedRequest.allocationDetails && (
                  <>
                    <Grid item xs={12}>
                      <Divider />
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">Allocation Details</Typography>
                      <Typography variant="body1">
                        Building: {selectedRequest.allocationDetails.building}
                      </Typography>
                      <Typography variant="body1">
                        Block: {selectedRequest.allocationDetails.block}
                      </Typography>
                      <Typography variant="body1">
                        Slot: {selectedRequest.allocationDetails.slotLabel}
                      </Typography>
                      <Typography variant="body1">
                        Grain: {selectedRequest.allocationDetails.grainType} ({selectedRequest.allocationDetails.bags} bags)
                      </Typography>
                    </Grid>
                  </>
                )}

                {selectedRequest.type === 'loan_approval' && selectedRequest.status === 'pending' && (
                  <>
                    <Grid item xs={12}>
                      <Divider />
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom>Loan Details to Approve</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Loan Amount (₹)"
                        type="number"
                        value={loanAmount}
                        onChange={(e) => setLoanAmount(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Interest Rate (%)"
                        type="number"
                        value={interestRate}
                        onChange={(e) => setInterestRate(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Duration (months)"
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Collateral"
                        value={loanCollateral}
                        onChange={(e) => setLoanCollateral(e.target.value)}
                      />
                    </Grid>
                    {loanAmount && interestRate && duration && (
                      <Grid item xs={12}>
                        <Alert severity="info">
                          Monthly EMI: ₹{((parseFloat(loanAmount) * (1 + parseFloat(interestRate) / 100)) / parseInt(duration)).toFixed(2)}
                        </Alert>
                      </Grid>
                    )}
                  </>
                )}

                {selectedRequest.status === 'pending' && (
                  <>
                    <Grid item xs={12}>
                      <Divider />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Rejection Reason (if rejecting)"
                        multiline
                        rows={3}
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                      />
                    </Grid>
                  </>
                )}

                {selectedRequest.status === 'rejected' && selectedRequest.rejectionReason && (
                  <Grid item xs={12}>
                    <Alert severity="error">
                      <Typography variant="subtitle2">Rejection Reason:</Typography>
                      <Typography variant="body2">{selectedRequest.rejectionReason}</Typography>
                    </Alert>
                  </Grid>
                )}

                {selectedRequest.status === 'approved' && selectedRequest.createdLoan && (
                  <Grid item xs={12}>
                    <Alert severity="success">
                      <Typography variant="subtitle2">Loan Created Successfully</Typography>
                      <Typography variant="body2">
                        Amount: ₹{selectedRequest.createdLoan.amount} | 
                        Interest: {selectedRequest.createdLoan.interestRate}% | 
                        Duration: {selectedRequest.createdLoan.duration} months
                      </Typography>
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedRequest?.status === 'pending' ? (
            <>
              <Button 
                onClick={() => {
                  setProcessDialog(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                startIcon={<Cancel />}
                color="error"
                onClick={handleReject}
                disabled={loading}
              >
                Reject
              </Button>
              <Button
                startIcon={<CheckCircle />}
                variant="contained"
                color="success"
                onClick={handleApprove}
                disabled={loading}
              >
                Approve
              </Button>
            </>
          ) : (
            <Button 
              onClick={() => {
                setProcessDialog(false);
                resetForm();
              }}
            >
              Close
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OwnerRequestManagement;
