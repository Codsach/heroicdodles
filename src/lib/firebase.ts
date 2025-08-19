// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "heroic-doodles",
  "appId": "1:707805350373:web:8ab33127b1fd5cce06470c",
  "storageBucket": "heroic-doodles.firebasestorage.app",
  "apiKey": "AIzaSyBPHXdYCJlpjhuaYGPbumzhpuB-VBry9eE",
  "authDomain": "heroic-doodles.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "707805350373"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const storage = getStorage(app);

export { app, db, storage };
