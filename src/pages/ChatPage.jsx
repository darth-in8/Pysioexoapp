import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    Container,
    Typography,
    Box,
    Paper,
    TextField,
    Button,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Divider,
    Grid,
    Card,
    CardContent,
    IconButton,
    Badge,
    Chip,
    CircularProgress,
    Alert
} from '@mui/material';
import {
    Send as SendIcon,
    Person as PersonIcon,
    LocalHospital as DoctorIcon,
    Circle as OnlineIcon,
    Search as SearchIcon
} from '@mui/icons-material';
import {
    sendMessage,
    getConversations,
    getMessages,
    markMessagesAsRead,
    subscribeToMessages,
    getUserData,
    searchUsers
} from '../services/chatService';

const ChatPage = () => {
    const { currentUser, userData } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const messagesEndRef = useRef(null);
    const unsubscribeRef = useRef(null);

    useEffect(() => {
        if (currentUser && userData) {
            loadConversations();
        }
    }, [currentUser, userData]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        // Cleanup subscription on unmount or conversation change
        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
            }
        };
    }, [selectedConversation]);

    const loadConversations = async () => {
        try {
            setLoading(true);
            const convs = await getConversations(currentUser.uid, userData.role);
            setConversations(convs);
        } catch (error) {
            console.error('Error loading conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateConversationLastMessage = (conversationId, lastMessage, timestamp) => {
        setConversations(prevConversations =>
            prevConversations.map(conv =>
                conv.otherUser.uid === conversationId
                    ? { ...conv, lastMessage, lastMessageTime: timestamp }
                    : conv
            )
        );
    };

    const selectConversation = async (conversation) => {
        try {
            // Unsubscribe from previous conversation
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
            }

            setSelectedConversation(conversation);
            setMessages([]);

            // Mark messages as read
            await markMessagesAsRead(
                currentUser.uid,
                conversation.otherUser.uid,
                userData.role
            );

            // Subscribe to real-time messages
            unsubscribeRef.current = subscribeToMessages(
                currentUser.uid,
                conversation.otherUser.uid,
                userData.role,
                (newMessages) => {
                    setMessages(newMessages);
                    // Mark new messages as read when they arrive
                    markMessagesAsRead(currentUser.uid, conversation.otherUser.uid, userData.role);
                }
            );

        } catch (error) {
            console.error('Error selecting conversation:', error);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConversation || sending) return;

        const messageText = newMessage.trim();
        const timestamp = new Date();

        try {
            setSending(true);
            await sendMessage(
                currentUser.uid,
                selectedConversation.otherUser.uid,
                messageText,
                userData.role
            );

            // Clear the input immediately for better UX
            setNewMessage('');

            // Update the conversation list with the new last message
            updateConversationLastMessage(
                selectedConversation.otherUser.uid,
                messageText,
                timestamp
            );

            // The real-time subscription will automatically update the messages
            // so we don't need to reload conversations or messages manually

        } catch (error) {
            console.error('Error sending message:', error);
            // If there's an error, restore the message in the input
            setNewMessage(messageText);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            if (e.shiftKey) {
                // Shift+Enter: Allow default behavior (new line)
                return;
            } else {
                // Enter only: Send message
                e.preventDefault();
                handleSendMessage(e);
            }
        }
    };

    const handleSearch = async (query) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        try {
            setSearching(true);
            const results = await searchUsers(query, userData.role);
            setSearchResults(results);
        } catch (error) {
            console.error('Error searching users:', error);
        } finally {
            setSearching(false);
        }
    };

    const startNewConversation = async (user) => {
        try {
            // Check if conversation already exists
            const existingConv = conversations.find(conv => conv.otherUser.uid === user.uid);
            if (existingConv) {
                selectConversation(existingConv);
            } else {
                // Create new conversation object
                const newConv = {
                    otherUser: user,
                    lastMessage: null,
                    lastMessageTime: null,
                    unreadCount: 0
                };

                // Add to conversations list
                setConversations(prev => [newConv, ...prev]);
                setSelectedConversation(newConv);
                setMessages([]);
            }
            setSearchQuery('');
            setSearchResults([]);
        } catch (error) {
            console.error('Error starting conversation:', error);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 24 * 60 * 60 * 1000) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString();
        }
    };

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress />
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 2, mb: 2 }}>
            <Typography variant="h4" gutterBottom>
                Messages
            </Typography>

            <Paper elevation={2} sx={{ height: '80vh', display: 'flex' }}>
                {/* Conversations List */}
                <Box sx={{ width: '30%', borderRight: 1, borderColor: 'divider' }}>
                    {/* Search Bar */}
                    <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                        <TextField
                            fullWidth
                            placeholder={`Search ${userData.role === 'doctor' ? 'patients' : 'doctors'}...`}
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                handleSearch(e.target.value);
                            }}
                            InputProps={{
                                startAdornment: searching ? <CircularProgress size={20} /> : <SearchIcon />
                            }}
                            size="small"
                        />

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <Paper elevation={1} sx={{ mt: 1, maxHeight: 200, overflow: 'auto' }}>
                                <List dense>
                                    {searchResults.map((user) => (
                                        <ListItem
                                            key={user.uid}
                                            button
                                            onClick={() => startNewConversation(user)}
                                        >
                                            <ListItemAvatar>
                                                <Avatar>
                                                    {user.role === 'doctor' ? <DoctorIcon /> : <PersonIcon />}
                                                </Avatar>
                                            </ListItemAvatar>
                                            <ListItemText
                                                primary={user.fullName}
                                                secondary={
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Chip
                                                            label={user.role}
                                                            size="small"
                                                            color={user.role === 'doctor' ? 'secondary' : 'primary'}
                                                        />
                                                        {user.role === 'doctor' && user.specialization && (
                                                            <Typography variant="caption" color="text.secondary">
                                                                {user.specialization}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                }
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Paper>
                        )}
                    </Box>

                    {/* Conversations List */}
                    <List sx={{ flex: 1, overflow: 'auto' }}>
                        {conversations.length === 0 ? (
                            <Box sx={{ p: 3, textAlign: 'center' }}>
                                <Typography color="text.secondary">
                                    No conversations yet. Search for {userData.role === 'doctor' ? 'patients' : 'doctors'} to start chatting.
                                </Typography>
                            </Box>
                        ) : (
                            conversations.map((conversation) => (
                                <ListItem
                                    key={conversation.otherUser.uid}
                                    button
                                    selected={selectedConversation?.otherUser.uid === conversation.otherUser.uid}
                                    onClick={() => selectConversation(conversation)}
                                    sx={{
                                        borderBottom: 1,
                                        borderColor: 'divider',
                                        '&.Mui-selected': {
                                            backgroundColor: 'action.selected'
                                        }
                                    }}
                                >
                                    <ListItemAvatar>
                                        <Badge
                                            badgeContent={conversation.unreadCount}
                                            color="error"
                                            max={99}
                                        >
                                            <Avatar>
                                                {conversation.otherUser.role === 'doctor' ? <DoctorIcon /> : <PersonIcon />}
                                            </Avatar>
                                        </Badge>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="subtitle1">
                                                    {conversation.otherUser.fullName}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {formatTime(conversation.lastMessageTime)}
                                                </Typography>
                                            </Box>
                                        }
                                        secondary={
                                            <Box>
                                                <Chip
                                                    label={conversation.otherUser.role}
                                                    size="small"
                                                    color={conversation.otherUser.role === 'doctor' ? 'secondary' : 'primary'}
                                                    sx={{ mr: 1, mb: 0.5 }}
                                                />
                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                    sx={{
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    {conversation.lastMessage || 'No messages yet'}
                                                </Typography>
                                            </Box>
                                        }
                                    />
                                </ListItem>
                            ))
                        )}
                    </List>
                </Box>

                {/* Chat Area */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {selectedConversation ? (
                        <>
                            {/* Chat Header */}
                            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Avatar>
                                        {selectedConversation.otherUser.role === 'doctor' ? <DoctorIcon /> : <PersonIcon />}
                                    </Avatar>
                                    <Box>
                                        <Typography variant="h6">
                                            {selectedConversation.otherUser.fullName}
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Chip
                                                label={selectedConversation.otherUser.role}
                                                size="small"
                                                color={selectedConversation.otherUser.role === 'doctor' ? 'secondary' : 'primary'}
                                            />
                                            {selectedConversation.otherUser.role === 'doctor' && selectedConversation.otherUser.specialization && (
                                                <Typography variant="body2" color="text.secondary">
                                                    {selectedConversation.otherUser.specialization}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Box>
                                </Box>
                            </Box>

                            {/* Messages */}
                            <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
                                {messages.length === 0 ? (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                        <Typography color="text.secondary">
                                            Start a conversation with {selectedConversation.otherUser.fullName}
                                        </Typography>
                                    </Box>
                                ) : (
                                    messages.map((message) => (
                                        <Box
                                            key={message.id}
                                            sx={{
                                                display: 'flex',
                                                justifyContent: message.senderId === currentUser.uid ? 'flex-end' : 'flex-start',
                                                mb: 1
                                            }}
                                        >
                                            <Paper
                                                elevation={1}
                                                sx={{
                                                    p: 2,
                                                    maxWidth: '70%',
                                                    bgcolor: message.senderId === currentUser.uid ? 'primary.main' : 'background.paper',
                                                    color: message.senderId === currentUser.uid ? 'primary.contrastText' : 'text.primary'
                                                }}
                                            >
                                                <Typography variant="body1">
                                                    {message.content}
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        display: 'block',
                                                        mt: 0.5,
                                                        opacity: 0.7
                                                    }}
                                                >
                                                    {formatTime(message.timestamp)}
                                                </Typography>
                                            </Paper>
                                        </Box>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </Box>

                            {/* Message Input */}
                            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                                <form onSubmit={handleSendMessage}>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <TextField
                                            fullWidth
                                            placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            disabled={sending}
                                            multiline
                                            maxRows={4}
                                        />
                                        <IconButton
                                            type="submit"
                                            color="primary"
                                            disabled={!newMessage.trim() || sending}
                                        >
                                            {sending ? <CircularProgress size={24} /> : <SendIcon />}
                                        </IconButton>
                                    </Box>
                                </form>
                            </Box>
                        </>
                    ) : (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <Typography variant="h6" color="text.secondary">
                                Select a conversation to start messaging
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Paper>
        </Container>
    );
};

export default ChatPage;