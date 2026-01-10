import React, { useState, useEffect, useCallback } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Badge,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery,
  Box,
  Chip,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications,
  AccountCircle,
  Dashboard,
  LocalShipping,
  Warehouse,
  People,
  Payment,
  ExitToApp,
  Settings,
  Grain,
  Work
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import NotificationPanel from './NotificationPanel';
import axios from 'axios';

const Navbar = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [occupancyData, setOccupancyData] = useState({
    totalSections: 0,
    occupiedSections: 0,
    totalBags: 0,
    totalWeight: 0,
    occupancyPercentage: 0
  });
  
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const { user, logout } = useAuth();
  const { notifications } = useSocket();

  const fetchOccupancyData = useCallback(async () => {
    try {
      const response = await axios.get('/api/warehouse/occupancy');
      setOccupancyData(response.data);
    } catch (error) {
      // Silently handle error - occupancy endpoint might not be accessible yet
      if (error.response?.status !== 404) {
        console.error('Error fetching occupancy data:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'owner') {
      fetchOccupancyData();
      // Refresh occupancy data every 30 seconds
      const interval = setInterval(fetchOccupancyData, 30000);
      return () => clearInterval(interval);
    }
  }, [user, fetchOccupancyData]);

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleProfileMenuClose();
  };

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const menuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/', roles: ['owner', 'customer', 'worker'] },
    { text: 'Weigh Bridge & Payments', icon: <LocalShipping />, path: '/weigh-bridge', roles: ['owner', 'worker'] },
    { text: 'Owner Dashboard', icon: <Settings />, path: '/owner-dashboard', roles: ['owner'] },
    { text: 'Customer Dashboard', icon: <AccountCircle />, path: '/customer-dashboard', roles: ['customer'] },
    { text: 'Vehicle Management', icon: <LocalShipping />, path: '/vehicles', roles: ['owner', 'worker'] },
    { text: 'Worker Tracking', icon: <Work />, path: '/worker-tracking', roles: ['owner'] },
    { text: 'Customer Grain', icon: <Grain />, path: '/customer-grain', roles: ['owner', 'customer'] }
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role)
  );

  const DrawerContent = () => (
    <div style={{ width: 250 }}>
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="h6" color="primary">
          Warehouse MS
        </Typography>
      </Box>
      <Divider />
      <List>
        {filteredMenuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            onClick={() => {
              navigate(item.path);
              if (isMobile) setDrawerOpen(false);
            }}
            selected={location.pathname === item.path}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          {isMobile && (
            <IconButton
              edge="start"
              color="inherit"
              onClick={toggleDrawer}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Warehouse Management System
          </Typography>

          {/* Warehouse Occupancy Display */}
          {user?.role === 'owner' && !isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
              <Tooltip title="Warehouse Occupancy">
                <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'rgba(255,255,255,0.1)', px: 2, py: 0.5, borderRadius: 1 }}>
                  <Warehouse fontSize="small" sx={{ mr: 1 }} />
                  <Box sx={{ textAlign: 'center', minWidth: 60 }}>
                    <Typography variant="caption" display="block">
                      {occupancyData.occupiedSections}/{occupancyData.totalSections} Sections
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={occupancyData.occupancyPercentage} 
                      sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.2)' }}
                    />
                  </Box>
                </Box>
              </Tooltip>
              
              <Tooltip title="Total Grain Storage">
                <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'rgba(255,255,255,0.1)', px: 2, py: 0.5, borderRadius: 1, ml: 1 }}>
                  <Grain fontSize="small" sx={{ mr: 1 }} />
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" display="block">
                      {occupancyData.totalBags} Bags
                    </Typography>
                    <Typography variant="caption" display="block">
                      {(occupancyData.totalWeight / 1000).toFixed(1)}T
                    </Typography>
                  </Box>
                </Box>
              </Tooltip>
            </Box>
          )}

          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              {filteredMenuItems.map((item) => (
                <Button
                  key={item.text}
                  color="inherit"
                  onClick={() => navigate(item.path)}
                  sx={{
                    backgroundColor: location.pathname === item.path ? 'rgba(255,255,255,0.1)' : 'transparent'
                  }}
                >
                  {item.text}
                </Button>
              ))}
            </Box>
          )}

          <IconButton
            color="inherit"
            onClick={() => setNotificationOpen(true)}
          >
            <Badge badgeContent={notifications.length} color="error">
              <Notifications />
            </Badge>
          </IconButton>

          <IconButton
            edge="end"
            onClick={handleProfileMenuOpen}
            color="inherit"
          >
            <Avatar sx={{ width: 32, height: 32 }}>
              {user?.username?.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem onClick={() => {
              navigate('/profile');
              handleProfileMenuClose();
            }}>
              <AccountCircle sx={{ mr: 1 }} />
              Profile
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ExitToApp sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer}
      >
        <DrawerContent />
      </Drawer>

      <NotificationPanel
        open={notificationOpen}
        onClose={() => setNotificationOpen(false)}
      />
    </>
  );
};

export default Navbar;