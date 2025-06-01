const admin = require('firebase-admin');
const cron = require('node-cron');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function deleteOldPosts() {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const postsRef = db.collection('posts');
  const snapshot = await postsRef.where('createdAt', '<=', oneWeekAgo).get();

  for (const doc of snapshot.docs) {
    const post = doc.data();
    const commentsRef = db.collection('posts').doc(doc.id).collection('comments');
    const commentsSnapshot = await commentsRef.limit(1).get();

    if (commentsSnapshot.empty) {
      console.log(`Deleting post ${doc.id} (older than 1 week, no comments)`);
      await doc.ref.delete();
    }
  }
}

// Run every day at midnight
cron.schedule('0 0 * * *', () => {
  console.log('Running post deletion cron job');
  deleteOldPosts().catch(console.error);
});

// Run immediately on start
deleteOldPosts().catch(console.error);
