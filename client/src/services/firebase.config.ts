import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBnArPsa8xi8aB9-aCjENcXA09sgjFvCy4",
  authDomain: "mana-city-98fa0.firebaseapp.com",
  projectId: "mana-city-98fa0",
  storageBucket: "mana-city-98fa0.appspot.com",
  messagingSenderId: "1011241089335",
  appId: "1:1011241089335:web:2ba85628781c7af1f502b2",
  measurementId: "G-JMXQCQ7FC8",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
