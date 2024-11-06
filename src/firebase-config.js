const admin = require('firebase-admin');
const serviceAccount = require('../src/ambergrapeecommerce-firebase-adminsdk-5qyg1-7e57e1001b.json');  // Path to your Firebase Admin SDK service account file

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'ambergrapeecommerce.appspot.com',  // Your Firebase Storage bucket name
});

const bucket = admin.storage().bucket();  // Initialize Firebase Storage bucket