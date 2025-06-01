const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const path = require('path');

// Initialize Firebase Admin SDK with your service account JSON file
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend build folder
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Example API: get user profile by handle
app.get('/api/user/:handle', async (req, res) => {
  try {
    const handle = req.params.handle;
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('handle', '==', handle).limit(1).get();
    if (snapshot.empty) return res.status(404).json({error: 'User not found'});

    const userDoc = snapshot.docs[0];
    res.json(userDoc.data());
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// Example API: search users and posts (simple text search)
app.get('/api/search', async (req, res) => {
  try {
    const q = req.query.q.toLowerCase();

    // Search users by handle or name
    const usersRef = db.collection('users');
    const userSnapshot = await usersRef
      .where('handle', '>=', q)
      .where('handle', '<=', q + '\uf8ff')
      .limit(10)
      .get();

    const users = userSnapshot.docs.map(doc => doc.data());

    // Search posts by text (simple approach: Firestore doesn't do text search natively)
    // For production, integrate Algolia or ElasticSearch
    const postsRef = db.collection('posts');
    const postsSnapshot = await postsRef
      .where('text', '>=', q)
      .where('text', '<=', q + '\uf8ff')
      .limit(10)
      .get();

    const posts = postsSnapshot.docs.map(doc => doc.data());

    res.json({users, posts});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// Catch all: serve React frontend for any other route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
