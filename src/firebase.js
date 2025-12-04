import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Конфигурация вашего проекта "fer-plan"
const firebaseConfig = {
  apiKey: "AIzaSyCZEEID91ieiGxLy4g2HJid7o5qlL0M_tM",
  authDomain: "fer-plan.firebaseapp.com",
  projectId: "fer-plan",
  storageBucket: "fer-plan.firebasestorage.app",
  messagingSenderId: "981276017202",
  appId: "1:981276017202:web:011209fb926bd87037722b",
  measurementId: "G-YEE7KR05N3"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);

// Экспортируем базу данных, чтобы использовать её в других файлах
export const db = getFirestore(app);