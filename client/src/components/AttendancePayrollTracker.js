import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Alert
} from '@mui/material';
import { AccessTime, AttachMoney, CalendarToday } from '@mui/icons-material';
import axios from 'axios';

const AttendancePayrollTracker = () => {
  const [attendance, setAttendance] = useState(null);
  const [clockedIn, setClockedIn] = useState(false);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/workers/my-attendance', {
          headers: { 'x-auth-token': token }
        });
        setAttendance(response.data);
        setClockedIn(response.data.todayStatus === 'clocked-in');
      } catch (err) {
        console.error('Failed to fetch attendance');
      }
    };
    fetchAttendance();
  }, []);

  const handleClockIn = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/workers/clock-in', { time: new Date() }, {
        headers: { 'x-auth-token': token }
      });
      setClockedIn(true);
      alert('Clocked in successfully!');
    } catch (err) {
      alert('Failed to clock in');
    }
  };

  const handleClockOut = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/workers/clock-out', { time: new Date() }, {
        headers: { 'x-auth-token': token }
      });
      setClockedIn(false);
      alert('Clocked out successfully!');
    } catch (err) {
      alert('Failed to clock out');
    }
  };

  if (!attendance) return <Box sx={{ p: 3 }}>Loading...</Box>;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        <AccessTime sx={{ verticalAlign: 'middle', mr: 1 }} />
        Attendance & Payroll
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold">Today's Shift</Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Chip 
              label={clockedIn ? 'Clocked In' : 'Not Clocked In'}
              color={clockedIn ? 'success' : 'default'}
              icon={<AccessTime />}
            />
            {clockedIn && (
              <Chip label={`${attendance.todayHours || 0} hours`} color="primary" />
            )}
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Button
                variant="contained"
                fullWidth
                onClick={handleClockIn}
                disabled={clockedIn}
              >
                Clock In
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button
                variant="outlined"
                fullWidth
                onClick={handleClockOut}
                disabled={!clockedIn}
              >
                Clock Out
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="textSecondary">Days Worked</Typography>
              <Typography variant="h4" fontWeight="bold">{attendance.daysWorked || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="textSecondary">Total Hours</Typography>
              <Typography variant="h4" fontWeight="bold">{attendance.totalHours || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="textSecondary">Overtime</Typography>
              <Typography variant="h4" fontWeight="bold" color="warning.main">{attendance.overtime || 0}h</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="textSecondary">Expected Salary</Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                ₹{attendance.expectedSalary?.toLocaleString() || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold">Leave Balance</Typography>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Typography variant="body2" color="textSecondary">Casual</Typography>
              <Typography variant="h5" fontWeight="bold">{attendance.leaveBalance?.casual || 5}</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" color="textSecondary">Sick</Typography>
              <Typography variant="h5" fontWeight="bold">{attendance.leaveBalance?.sick || 3}</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" color="textSecondary">Earned</Typography>
              <Typography variant="h5" fontWeight="bold">{attendance.leaveBalance?.earned || 8}</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AttendancePayrollTracker;
