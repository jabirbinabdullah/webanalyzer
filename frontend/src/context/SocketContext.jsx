import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        // Connect to the backend
        // In production (Docker), this should point to relative path or configured URL
        // But for development, sticky to localhost:5000 if not proxying
        // Since we are using CRA proxy or direct URL in api.js
        const API_URL = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

        const newSocket = io(API_URL);

        newSocket.on('connect', () => {
            console.log('Connected to socket server');
        });

        setSocket(newSocket);

        return () => {
            newSocket.close();
        };
    }, []);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};
