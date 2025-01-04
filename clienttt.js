// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const MongoClient = require('mongodb').MongoClient;

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

const url = 'mongodb://localhost:27017'; // MongoDB URI
const dbName = 'chatdb'; // Database name

// MongoDB connection setup
async function connectToDatabase() {
    const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    return client.db(dbName);
}

io.on('connection', (socket) => {
    socket.on('joinRoom', async (room) => {
        socket.join(room);

        // Emit the room's chat history to the user who joined
        const db = await connectToDatabase();
        const collectionName = `room_${room}`;
        const messagesCollection = db.collection(collectionName);

        const chatHistory = await messagesCollection.find().toArray();
        socket.emit('roomData', chatHistory);
    });

    socket.on('chatMessage', async (room, message) => {
        console.log(`Received chat message in room ${room}:`, message);

        // Insert the message into the room's collection
        const db = await connectToDatabase();
        const collectionName = `room_${room}`;
        const messagesCollection = db.collection(collectionName);

        const messageData = {
            message,
            sender: socket.id,
            timestamp: new Date(),
        };

        await messagesCollection.insertOne(messageData);

        // Emit the message to all clients in the room
        io.to(room).emit('message', messageData);
    });

    socket.on('disconnect', () => {
        socket.rooms.forEach((room) => {
            socket.leave(room);
        });
    });
});

//Add a route to search messages
app.get('/search-messages', async (req, res) => {
    const searchTerm = req.query.term.trim(); // Trim leading/trailing whitespace
    const roomName = req.query.room;
    // Connect to the database and search for messages
    const db = await connectToDatabase();
    const collectionName = `room_${req.query.room}`; // Use the room name as the collection name
    const messagesCollection = db.collection(collectionName);

    // Create a regular expression for case-insensitive search
    const regex = new RegExp(searchTerm, 'i');

    // Search for messages containing the search term
    const searchResults = await messagesCollection.find({ message: regex }).toArray();
    const response = {
        results: searchResults.map(result => result.message),
    };
    
  
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


