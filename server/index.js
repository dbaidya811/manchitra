require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const { OAuth2Client } = require('google-auth-library');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 5000;

// Enable CORS for all routes (allows frontend to communicate with backend)
app.use(cors());

// Middleware (for receiving JSON data)
app.use(express.json());

// Serve static files (images)
app.use(express.static(path.join(__dirname, 'public')));

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
      userEmail TEXT,
      userName TEXT,
      userPicture TEXT
    )`, () => {
      // Automatically add missing columns for older databases (Safe Schema Upgrade)
      db.run(`ALTER TABLE posts ADD COLUMN location TEXT`, () => {});
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
    // Return the newly created post
    res.status(201).json({ 
      id: this.lastID, 
      pandalName, 
      area, 
      description, 
      location,
      imageUrl,
      time, 
      likes: 0, 
      comments: 0,
      userEmail,
      userName,
      userPicture
    });
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
      res.json(row);
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

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});