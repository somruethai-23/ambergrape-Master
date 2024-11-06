require("dotenv").config();
const admin = require('firebase-admin');
const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'ambergrapeecommerce.appspot.com',
});

const bucket = admin.storage().bucket();  // Initialize Firebase Storage bucket