import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  TextField,
  Button,
  Tabs,
  Tab,
  Badge,
  Divider
} from '@mui/material';
import { Chat, Announcement, Send } from '@mui/icons-material';
import axios from 'axios';

const WorkerCommunicationCenter = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [announcements, setAnnouncements] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const [announcementsRes, messagesRes] = await Promise.all([
          axios.get('/api/workers/announcements', {
            headers: { 'x-auth-token': token }
          }),
          axios.get('/api/workers/team-chat', {
            headers: { 'x-auth-token': token }
          })
        ]);
        setAnnouncements(announcementsRes.data);
        setMessages(messagesRes.data);
      } catch (err) {
        console.error('Failed to fetch data');
      }
    };
    fetchData();
  }, []);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/workers/send-message', {
        message: newMessage
      }, {
        headers: { 'x-auth-token': token }
      });
      setNewMessage('');
    } catch (err) {
      alert('Failed to send message');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        <Chat sx={{ verticalAlign: 'middle', mr: 1 }} />
        Communication Center
      </Typography>

      <Card sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label={
            <Badge badgeContent={announcements.length} color="primary">
              <Box sx={{ px: 1 }}>Announcements</Box>
            </Badge>
          } />
          <Tab label={
            <Badge badgeContent={messages.filter(m => !m.read).length} color="error">
              <Box sx={{ px: 1 }}>Team Chat</Box>
            </Badge>
          } />
        </Tabs>
      </Card>

      {activeTab === 0 && (
        <Card>
          <CardContent>
            <List>
              {announcements.map((announcement, index) => (
                <React.Fragment key={announcement._id}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body1" fontWeight="bold">
                            {announcement.title}
                          </Typography>
                          <Chip label={announcement.priority} color={announcement.priority === 'high' ? 'error' : 'default'} size="small" />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            {announcement.message}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {new Date(announcement.date).toLocaleString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < announcements.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {activeTab === 1 && (
        <Box>
          <Card sx={{ mb: 2, maxHeight: 400, overflow: 'auto' }}>
            <CardContent>
              <List>
                {messages.map((message) => (
                  <ListItem key={message._id}>
                    <ListItemText
                      primary={<Typography fontWeight="bold">{message.sender}</Typography>}
                      secondary={
                        <Box>
                          <Typography variant="body2">{message.text}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  fullWidth
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button variant="contained" onClick={handleSendMessage} endIcon={<Send />}>
                  Send
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default WorkerCommunicationCenter;
