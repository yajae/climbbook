import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import cors from 'cors';
import path from 'path';
import { Server } from 'socket.io';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { UserPathModel, ChatMessage } from './models/model.js';
const { ObjectId } = mongoose.Types;
import userRoutes from './routes/userRoutes.js';
import routeRoutes from './routes/routeRoutes.js';

const app = express();
const server = createServer(app);
const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(express.json());
app.use(cookieParser());
const corsOptions = {
    origin: 'https://frontend.yvonnei.com',
    credentials: true
};
app.use(cors(corsOptions));

const io = new Server(server, {
    cors: {
      origin: 'https://frontend.yvonnei.com',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });
app.use('/api', userRoutes);
app.use('/route', routeRoutes);

io.on('connection', async (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join-room', (room) => {
        socket.join(room);
        console.log(`Client ${socket.id} joined room ${room}`);
    });

    socket.on('new-marker', async (data) => {
        const { lngLat, userId, routeId, room, placeName, day, time, routeName } = data;
        const { lng, lat } = lngLat;

        const userPath = await UserPathModel.findOne({ userId });
        if (!userPath) {
            console.log('no user path')
           const userPath = new UserPathModel({
              userId: userId,
              paths: []
            });
          }
          if (!userPath) {
            throw new Error('User path is null or undefined');
        }

        if (!userPath.paths) {
            throw new Error('User path does not contain paths property');
        }
        if(userPath.paths){
            const path = userPath.paths.find(p => p._id.equals(new ObjectId(routeId)));

            if (!path.markers) {
                path.markers = {};
              }
              if (!path.markers.day1) {
                path.markers.day1 = [];
              }
            path.markers.day1.push({ lng, lat, placeName, day, time });
            await userPath.save();
        } else {
            console.log('Route ID not found', routeId);
        }
        io.to(room).emit('new-marker', { lngLat });
    });

    socket.on('delete-marker', async (data) => {
        const { room, lngLat } = data;

        try {
            await UserPathModel.updateOne(
                { 'paths.markers.day1.lng': lngLat.lng, 'paths.markers.day1.lat': lngLat.lat },
                { $pull: { 'paths.$.markers.day1': { lng: lngLat.lng, lat: lngLat.lat } } }
            );
            io.to(room).emit('delete-marker', lngLat);
        } catch (error) {
            console.error('Error deleting marker:', error);
        }
    });

    socket.on('sendMessage', async (data) => {
        try {
            const { room, user, message, timestamp } = data;
            
            let roomMessages = await ChatMessage.findOne({ room });
    
            if (!roomMessages) {
                roomMessages = new ChatMessage({
                    room,
                    messages: []
                });
            }
            roomMessages.messages.push({ user, message, timestamp });
            await roomMessages.save();
            io.to(room).emit('receiveMessage', data);
        } catch (error) {
            console.error('Error saving chat message:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

app.use(express.static(join(__dirname, 'public')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public','index.html'));
});

server.listen(3000, () => {
    console.log(`Server is running on http://localhost:3000`);
});
