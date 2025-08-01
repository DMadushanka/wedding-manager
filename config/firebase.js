import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
// Firebase config
const firebaseConfig = {
  apiKey: "your API key",
  authDomain: "******",
  projectId: "****************",
  storageBucket: "****************",
  messagingSenderId: "****************",
  appId: "*********************"
};
const CLOUDINARY_UPLOAD_URL = '*******************';
const UPLOAD_PRESET = '**************';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Save user profile when signing up or logging in
const saveUserProfile = async (user) => {
  if (!user) return;

  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      name: user.displayName || null,
      email: user.email,
      avatar: user.photoURL || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }
};

// Listen for authentication state changes
onAuthStateChanged(auth, (user) => {
  if (user) saveUserProfile(user);
});

export { auth, db, collection, doc, setDoc, getDoc, deleteDoc, onSnapshot, serverTimestamp };

