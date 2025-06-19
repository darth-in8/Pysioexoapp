// src/services/chatService.js
import {
    ref,
    push,
    set,
    get,
    query,
    orderByChild,
    limitToLast,
    onValue,
    off,
    serverTimestamp,
    orderByKey
} from 'firebase/database';
import { db } from './firebase';

// Create a unique conversation ID between two users
const createConversationId = (userId1, userId2) => {
    return [userId1, userId2].sort().join('_');
};

// Send a message
export const sendMessage = async (senderId, receiverId, content, senderRole) => {
    try {
        const conversationId = createConversationId(senderId, receiverId);
        const messageData = {
            senderId,
            receiverId,
            content,
            timestamp: Date.now(),
            read: false,
            senderRole
        };

        // Add message to messages collection
        const messagesRef = ref(db, `messages/${conversationId}`);
        const newMessageRef = push(messagesRef);
        await set(newMessageRef, messageData);

        // Update conversation metadata for both users
        const conversationData = {
            lastMessage: content,
            lastMessageTime: Date.now(),
            lastSenderId: senderId
        };

        // Update sender's conversation list
        const senderConvRef = ref(db, `conversations/${senderId}/${receiverId}`);
        await set(senderConvRef, {
            ...conversationData,
            otherUserId: receiverId,
            unreadCount: 0 // Sender has read their own message
        });

        // Update receiver's conversation list
        const receiverConvRef = ref(db, `conversations/${receiverId}/${senderId}`);
        const receiverConvSnapshot = await get(receiverConvRef);
        const existingUnreadCount = receiverConvSnapshot.exists() ?
            (receiverConvSnapshot.val().unreadCount || 0) : 0;

        await set(receiverConvRef, {
            ...conversationData,
            otherUserId: senderId,
            unreadCount: existingUnreadCount + 1
        });

        return newMessageRef.key;
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
};

// Get conversations for a user
export const getConversations = async (userId, userRole) => {
    try {
        const conversationsRef = ref(db, `conversations/${userId}`);
        const snapshot = await get(conversationsRef);

        if (!snapshot.exists()) {
            return [];
        }

        const conversationsData = snapshot.val();
        const conversations = [];

        for (const [otherUserId, convData] of Object.entries(conversationsData)) {
            try {
                // Get other user's data
                const otherUserRef = ref(db, `users/${otherUserId}`);
                const otherUserSnapshot = await get(otherUserRef);

                if (otherUserSnapshot.exists()) {
                    const otherUserData = otherUserSnapshot.val();

                    // Only include conversations with opposite role
                    if ((userRole === 'doctor' && otherUserData.role === 'patient') ||
                        (userRole === 'patient' && otherUserData.role === 'doctor')) {

                        conversations.push({
                            otherUser: {
                                uid: otherUserId,
                                ...otherUserData
                            },
                            lastMessage: convData.lastMessage,
                            lastMessageTime: convData.lastMessageTime,
                            unreadCount: convData.unreadCount || 0,
                            lastSenderId: convData.lastSenderId
                        });
                    }
                }
            } catch (error) {
                console.error(`Error fetching user data for ${otherUserId}:`, error);
            }
        }

        // Sort by last message time (most recent first)
        conversations.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));

        return conversations;
    } catch (error) {
        console.error('Error getting conversations:', error);
        throw error;
    }
};

// Get messages for a conversation
export const getMessages = async (userId1, userId2, limit = 50) => {
    try {
        const conversationId = createConversationId(userId1, userId2);
        const messagesRef = ref(db, `messages/${conversationId}`);
        const messagesQuery = query(messagesRef, limitToLast(limit));

        const snapshot = await get(messagesQuery);

        if (!snapshot.exists()) {
            return [];
        }

        const messagesData = snapshot.val();
        const messages = Object.entries(messagesData).map(([key, value]) => ({
            id: key,
            ...value
        }));

        // Sort by timestamp
        messages.sort((a, b) => a.timestamp - b.timestamp);

        return messages;
    } catch (error) {
        console.error('Error getting messages:', error);
        throw error;
    }
};

// Subscribe to real-time messages
export const subscribeToMessages = (userId1, userId2, userRole, callback) => {
    const conversationId = createConversationId(userId1, userId2);
    const messagesRef = ref(db, `messages/${conversationId}`);
    const messagesQuery = query(messagesRef, limitToLast(50));

    const unsubscribe = onValue(messagesQuery, (snapshot) => {
        if (snapshot.exists()) {
            const messagesData = snapshot.val();
            const messages = Object.entries(messagesData).map(([key, value]) => ({
                id: key,
                ...value
            }));

            // Sort by timestamp
            messages.sort((a, b) => a.timestamp - b.timestamp);
            callback(messages);
        } else {
            callback([]);
        }
    });

    return unsubscribe;
};

// Mark messages as read
export const markMessagesAsRead = async (userId, otherUserId) => {
    try {
        const conversationRef = ref(db, `conversations/${userId}/${otherUserId}`);
        const snapshot = await get(conversationRef);

        if (snapshot.exists()) {
            const convData = snapshot.val();
            await set(conversationRef, {
                ...convData,
                unreadCount: 0
            });
        }
    } catch (error) {
        console.error('Error marking messages as read:', error);
        throw error;
    }
};

// Search for users (doctors search patients, patients search doctors)
export const searchUsers = async (searchQuery, currentUserRole) => {
    try {
        const usersRef = ref(db, 'users');
        const snapshot = await get(usersRef);

        if (!snapshot.exists()) {
            return [];
        }

        const usersData = snapshot.val();
        const results = [];
        const targetRole = currentUserRole === 'doctor' ? 'patient' : 'doctor';

        for (const [uid, userData] of Object.entries(usersData)) {
            if (userData.role === targetRole && userData.isActive) {
                const fullName = userData.fullName?.toLowerCase() || '';
                const email = userData.email?.toLowerCase() || '';
                const query = searchQuery.toLowerCase();

                if (fullName.includes(query) || email.includes(query)) {
                    results.push({
                        uid,
                        ...userData
                    });
                }
            }
        }

        // Sort results by name
        results.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));

        return results.slice(0, 10); // Limit to 10 results
    } catch (error) {
        console.error('Error searching users:', error);
        throw error;
    }
};

// Get user data by ID
export const getUserData = async (uid) => {
    try {
        const userRef = ref(db, `users/${uid}`);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
            return snapshot.val();
        } else {
            throw new Error('User not found');
        }
    } catch (error) {
        console.error('Error getting user data:', error);
        throw error;
    }
};

// Get total unread count for a user
export const getTotalUnreadCount = async (userId) => {
    try {
        const conversationsRef = ref(db, `conversations/${userId}`);
        const snapshot = await get(conversationsRef);

        if (!snapshot.exists()) {
            return 0;
        }

        const conversationsData = snapshot.val();
        let totalUnread = 0;

        for (const convData of Object.values(conversationsData)) {
            totalUnread += convData.unreadCount || 0;
        }

        return totalUnread;
    } catch (error) {
        console.error('Error getting total unread count:', error);
        return 0;
    }
};

// Subscribe to conversation updates (for real-time conversation list updates)
export const subscribeToConversations = (userId, userRole, callback) => {
    const conversationsRef = ref(db, `conversations/${userId}`);

    const unsubscribe = onValue(conversationsRef, async (snapshot) => {
        try {
            if (snapshot.exists()) {
                const conversationsData = snapshot.val();
                const conversations = [];

                for (const [otherUserId, convData] of Object.entries(conversationsData)) {
                    try {
                        const otherUserRef = ref(db, `users/${otherUserId}`);
                        const otherUserSnapshot = await get(otherUserRef);

                        if (otherUserSnapshot.exists()) {
                            const otherUserData = otherUserSnapshot.val();

                            // Only include conversations with opposite role
                            if ((userRole === 'doctor' && otherUserData.role === 'patient') ||
                                (userRole === 'patient' && otherUserData.role === 'doctor')) {

                                conversations.push({
                                    otherUser: {
                                        uid: otherUserId,
                                        ...otherUserData
                                    },
                                    lastMessage: convData.lastMessage,
                                    lastMessageTime: convData.lastMessageTime,
                                    unreadCount: convData.unreadCount || 0,
                                    lastSenderId: convData.lastSenderId
                                });
                            }
                        }
                    } catch (error) {
                        console.error(`Error fetching user data for ${otherUserId}:`, error);
                    }
                }

                // Sort by last message time
                conversations.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
                callback(conversations);
            } else {
                callback([]);
            }
        } catch (error) {
            console.error('Error in conversation subscription:', error);
            callback([]);
        }
    });

    return unsubscribe;
};

// Delete a conversation
export const deleteConversation = async (userId, otherUserId) => {
    try {
        const conversationRef = ref(db, `conversations/${userId}/${otherUserId}`);
        await set(conversationRef, null);
    } catch (error) {
        console.error('Error deleting conversation:', error);
        throw error;
    }
};

// Delete a message (only sender can delete)
export const deleteMessage = async (messageId, senderId, receiverId, currentUserId) => {
    try {
        if (senderId !== currentUserId) {
            throw new Error('You can only delete your own messages');
        }

        const conversationId = createConversationId(senderId, receiverId);
        const messageRef = ref(db, `messages/${conversationId}/${messageId}`);
        await set(messageRef, null);
    } catch (error) {
        console.error('Error deleting message:', error);
        throw error;
    }
};