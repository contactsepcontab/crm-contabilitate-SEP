import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBVa3rvb_tX5gTofoTkIxkY3v-_JvfxRt4",
  authDomain: "sep-crm-contabilitate.firebaseapp.com",
  projectId: "sep-crm-contabilitate",
  storageBucket: "sep-crm-contabilitate.firebasestorage.app",
  messagingSenderId: "60818166086",
  appId: "1:60818166086:web:8784a9cee7fba5b9c85547",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
