import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// THese informations are from julians coup project
const firebaseConfig = {
  apiKey: 'AIzaSyDMQNyw7NgxNbNrd_-2ifaNPKqRBIcuxwY',
  authDomain: 'coup-ca89c.firebaseapp.com',
  projectId: 'coup-ca89c',
  storageBucket: 'coup-ca89c.firebasestorage.app',
  messagingSenderId: '47237302861',
  appId: '1:47237302861:web:fe816df8845f3224b8aa04',
  measurementId: 'G-NP75PH5PHK',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
