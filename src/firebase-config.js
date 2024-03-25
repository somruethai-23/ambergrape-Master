// Import the Firebase SDK and Firebase services that you need
const firebase = require("firebase/app");
require("firebase/analytics");
require('dotenv').config();

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your Firebase configuration
const firebaseConfig = {
  apiKey: process.env.api_KEY,
  authDomain: process.env.auth_DO,
  projectId: process.env.project_ID,
  storageBucket: process.env.storage_BUCKET,
  messagingSenderId: process.env.Sender_ID,
  appId: process.env.app_ID,
  measurementId: process.env.measurement_ID // optional
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const analytics = firebase.analytics();

// Use the Firebase services as needed
