import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import MessageInput from './MessageInput';
import MessageList from './MessageList';

const socket = io('http://localhost:8080');

export default function ChatRoom({ username, room }) {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typingUser, setTypingUser] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    socket.emit('joinRoom', { username, room });
    socket.on('history', (history) => {
      setMessages(history);
    });
    socket.on('message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('systemMessage', (text) => {
      const sysMsg = {
        id: 'sys-' + Date.now(),
        username: 'System',
        type: 'system',
        content: text,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, sysMsg]);
    });

    socket.on('userList', (userList) => {
      setUsers(userList);
    });

    socket.on('typing', (typingUsername) => {
      setTypingUser(typingUsername);
      setTimeout(() => setTypingUser(null), 2000);
    });

    socket.on('messageUpdated', (updatedMsg) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === updatedMsg.id ? updatedMsg : msg))
      );
    });

    socket.on('messageDeleted', (id) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== id));
    });

    return () => {
      socket.emit('leaveRoom', { username, room });

      socket.off('history');
      socket.off('message');
      socket.off('systemMessage');
      socket.off('userList');
      socket.off('typing');
      socket.off('messageUpdated');
      socket.off('messageDeleted');
    };
  }, [username, room]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message or image
  const sendMessage = (message) => {
    socket.emit('sendMessage', { room, message });
  };

  // Send typing event
  const sendTyping = () => {
    socket.emit('typing', { room, username });
  };

  // Edit existing message
  const editMessage = (id, newContent) => {
    socket.emit('updateMessage', { room, id, newContent });
  };
  const deleteMessage = (id) => {
    socket.emit('deleteMessage', { room, id });
  };
  return (
    <div className="chat-container flex h-full">
      <div className="sidebar w-1/4 p-4 border-r border-gray-300">
        <h3 className="text-lg font-semibold mb-4">Room: {room}</h3>
        <h4 className="text-md font-semibold">Users:</h4>
        <ul>
          {users.map((u) => (
            <li key={u} className="mb-1">{u}</li>
          ))}
        </ul>
      </div>
      <div className="chat-main flex flex-col flex-1 p-4">
        <MessageList
          messages={messages}
          username={username}
          onEdit={editMessage}
          onDelete={deleteMessage}
        />
        {typingUser && typingUser !== username && (
          <div className="typing-indicator italic text-sm text-gray-500 mt-2">
            {typingUser} is typing...
          </div>
        )}
        <MessageInput onSend={sendMessage} onTyping={sendTyping} />
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
