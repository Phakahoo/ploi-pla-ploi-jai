const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBSsALDt2TNy_hG1oSy8tYrKfdK5LJvPHU",
  authDomain: "ploi-pla-ploi-jai.firebaseapp.com",
  databaseURL: "https://ploi-pla-ploi-jai-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ploi-pla-ploi-jai",
  storageBucket: "ploi-pla-ploi-jai.firebasestorage.app",
  messagingSenderId: "1014743331907",
  appId: "1:1014743331907:web:4d8c31d5ee123353c950f6"
};

const FIREBASE_READY = !Object.values(FIREBASE_CONFIG)
  .some(v => String(v).startsWith('YOUR_'));
