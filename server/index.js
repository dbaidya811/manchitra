require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const { OAuth2Client } = require('google-auth-library');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 5000;

// Enable CORS for all routes (allows frontend to communicate with backend)
app.use(cors());

// Middleware (for receiving JSON data)
app.use(express.json());

// Serve static files (images)
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Socket.io and allow CORS for your React app
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

io.on('connection', (socket) => {
  console.log('A user connected via Socket.io:', socket.id);
  socket.on('disconnect', () => console.log('User disconnected:', socket.id));
});

const imgDir = path.join(__dirname, 'public', 'images');
if (!fs.existsSync(imgDir)){
    fs.mkdirSync(imgDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:5000/api/auth/callback/google' // Redirect URI
);

// SQLite database setup
const db = new sqlite3.Database('./manchitra.db', (err) => {
  if (err) {
    console.error('SQLite database connection error:', err.message);
  } else {
    console.log('Connected to the SQLite database successfully! 🗄️');
    
    // Create table for posts if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pandalName TEXT,
      area TEXT,
      description TEXT,
      location TEXT,
      imageUrl TEXT,
      time TEXT,
      likes INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      visits INTEGER DEFAULT 0,
      userEmail TEXT,
      userName TEXT,
      userPicture TEXT
    )`, () => {
      // Automatically add missing columns for older databases (Safe Schema Upgrade)
      db.run(`ALTER TABLE posts ADD COLUMN location TEXT`, () => {});
      db.run(`ALTER TABLE posts ADD COLUMN visits INTEGER DEFAULT 0`, () => {});
      db.run(`ALTER TABLE posts ADD COLUMN imageUrl TEXT`, () => {});
      db.run(`ALTER TABLE posts ADD COLUMN userEmail TEXT`, () => {});
      db.run(`ALTER TABLE posts ADD COLUMN userName TEXT`, () => {});
      db.run(`ALTER TABLE posts ADD COLUMN userPicture TEXT`, () => {});
    });

    // Create table for users if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      google_id TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      picture TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  }
});

// GET all posts
app.get('/api/posts', (req, res) => {
  db.all("SELECT * FROM posts ORDER BY id DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST a new post
app.post('/api/posts', upload.single('image'), (req, res) => {
  const { pandalName, area, description, location, userEmail, userName, userPicture } = req.body;
  const imageUrl = req.file ? `/images/${req.file.filename}` : null;
  const time = "Just now";
  
  const sql = `INSERT INTO posts (pandalName, area, description, location, imageUrl, time, userEmail, userName, userPicture) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [pandalName, area, description, location, imageUrl, time, userEmail, userName, userPicture];

  db.run(sql, params, function (err) {
    if (err) return res.status(400).json({ error: err.message });
    
    const newPost = { 
      id: this.lastID, 
      pandalName, 
      area, 
      description, 
      location,
      imageUrl,
      time, 
      likes: 0, 
      comments: 0,
      visits: 0,
      userEmail,
      userName,
      userPicture
    };

    // Emit a real-time notification to EVERY connected user
    io.emit('receive-notification', {
      id: Date.now() + Math.floor(Math.random() * 1000), 
      type: 'info', 
      title: `New Pandal Added`, 
      message: `${pandalName || 'A new pandal'} was added to ${area || 'the map'}.`, 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
      read: false 
    });

    // Return the newly created post
    res.status(201).json(newPost);
  });
});

// UPDATE (Edit) a post
app.put('/api/posts/:id', upload.single('image'), (req, res) => {
  const postId = req.params.id;
  const { pandalName, area, description, location, existingImageUrl } = req.body;
  
  // If a new image is uploaded, use it. Otherwise, keep the old one.
  const imageUrl = req.file ? `/images/${req.file.filename}` : existingImageUrl;
  
  const sql = `UPDATE posts SET pandalName = ?, area = ?, description = ?, location = ?, imageUrl = ? WHERE id = ?`;
  const params = [pandalName, area, description, location, imageUrl, postId];

  db.run(sql, params, function (err) {
    if (err) return res.status(400).json({ error: err.message });
    
    db.get(`SELECT * FROM posts WHERE id = ?`, [postId], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // Emit a real-time notification to EVERY connected user
      io.emit('receive-notification', {
        id: Date.now() + Math.floor(Math.random() * 1000), 
        type: 'update', 
        title: `${row.pandalName || 'Pandal'} Updated`, 
        message: `Information for ${row.pandalName || 'a pandal'} was recently updated.`, 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
        read: false 
      });

      res.json(row);
    });
  });
});

// POST a visit to a pandal (to track crowd)
app.post('/api/posts/:id/visit', (req, res) => {
  const postId = req.params.id;
  
  db.run(`UPDATE posts SET visits = visits + 1 WHERE id = ?`, [postId], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    
    db.get(`SELECT pandalName, visits, area FROM posts WHERE id = ?`, [postId], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // Emit Crowd Alert Notification at specific milestones (e.g., 5, 10, 20, 50 visits)
      // Here we use 5 and multiples of 10 for demonstration
      if (row && (row.visits === 5 || row.visits % 10 === 0)) {
        io.emit('receive-notification', {
          id: Date.now() + Math.floor(Math.random() * 1000), 
          type: 'alert', 
          title: `🚨 Crowd Alert!`, 
          message: `${row.pandalName || 'A pandal'} in ${row.area || 'your area'} is getting very crowded! Over ${row.visits} people are currently visiting.`, 
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
          read: false 
        });
      }
      res.json({ success: true, visits: row ? row.visits : 0 });
    });
  });
});

// DELETE a post
app.delete('/api/posts/:id', (req, res) => {
  const postId = req.params.id;
  
  // First, get the image URL so we can delete the actual file
  db.get(`SELECT imageUrl FROM posts WHERE id = ?`, [postId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });

    // Delete the post record from database
    db.run(`DELETE FROM posts WHERE id = ?`, postId, function (err) {
      if (err) return res.status(400).json({ error: err.message });
      
      // If the post had an uploaded image, delete it from the public/images folder
      if (row && row.imageUrl && row.imageUrl.startsWith('/images/')) {
        const imagePath = path.join(__dirname, 'public', row.imageUrl);
        fs.unlink(imagePath, (unlinkErr) => {
          if (unlinkErr) console.error("Failed to delete image file:", unlinkErr);
        });
      }
      res.json({ message: "Post and image deleted successfully" });
    });
  });
});

// Step 1: Generate Auth URL and redirect user to Google
app.get('/api/auth/login/google', (req, res) => {
  const authUrl = googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
  });
  res.redirect(authUrl);
});

// Step 2: Handle Google's callback
app.get('/api/auth/callback/google', async (req, res) => {
  const { code } = req.query;
  try {
    // Exchange authorization code for tokens
    const { tokens } = await googleClient.getToken(code);
    googleClient.setCredentials(tokens);

    // Verify ID token to get user info
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: google_id, email, name, picture } = payload;

    // Find or create user in the database
    db.get('SELECT * FROM users WHERE google_id = ?', [google_id], (err, user) => {
      if (err) throw err; // This will be caught by the outer catch block

      if (!user) {
        // Insert new user
        db.run('INSERT INTO users (google_id, email, name, picture) VALUES (?, ?, ?, ?)', 
          [google_id, email, name, picture]);
      }

      const userPayload = { name, email, picture };
      // Redirect back to frontend with user data
      res.redirect(`http://localhost:3000/auth/callback?user=${encodeURIComponent(JSON.stringify(userPayload))}`);
    });

  } catch (error) {
    console.error('Authentication failed:', error);
    // Redirect to frontend with an error message
    res.redirect('http://localhost:3000/auth/callback?error=AuthenticationFailed');
  }
});

// Basic test route
app.get('/', (req, res) => {
  res.send('Manchitra Backend is running successfully! 🚀');
});

// Start the server (Using server.listen instead of app.listen for Socket.io)
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});