// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, signInWithPopup } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "studio-6387326320-4cdf0",
  "appId": "1:599214698518:web:03edf0965672f2f15a4537",
  "storageBucket": "studio-6387326320-4cdf0.firebasestorage.app",
  "apiKey": "AIzaSyCecudXdaMTpRipSN5EzQ6QZpF2HoPADCc",
  "authDomain": "studio-6387326320-4cdf0.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "599214698518"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

export { auth, googleProvider, facebookProvider, signInWithPopup };
