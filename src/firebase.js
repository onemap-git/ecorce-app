
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, serverTimestamp } from 'firebase/firestore';

// ADD this import for Storage:
import { getStorage } from 'firebase/storage';
const firebaseConfig = {
    apiKey: "AIzaSyAuaXIWX2K08mapzxi0OT7H4pkfnb1WpW4",
    authDomain: "ecorce-dev.firebaseapp.com",
    projectId: "ecorce-dev",
    storageBucket: "ecorce-dev.firebasestorage.app",
    messagingSenderId: "1096630557135",
    appId: "1:1096630557135:web:94434d5275a2a64e08daba",
    measurementId: "G-6K6XZHY6VZ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);
// Export storage:
const storage = getStorage(app);

export { app, auth, firestore, storage, serverTimestamp };