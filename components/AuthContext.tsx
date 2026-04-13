
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, query, collection, where, getDocs, Timestamp, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};

interface AuthContextType {
  user: User | null;
  userData: any | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isBanned: boolean;
  isSubscribed: boolean;
  appSettings: any;
  activateCode: (code: string) => Promise<void>;
  updateUserPhoto: (photoURL: string) => Promise<void>;
  updateAppSettings: (settings: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [appSettings, setAppSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const syncUserToFirestore = async (firebaseUser: User) => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    try {
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const initialData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || 'مستخدم جديد',
          photoURL: firebaseUser.photoURL || '',
          role: firebaseUser.email === 'adhamyosry56@gmail.com' ? 'admin' : 'user',
          status: 'active',
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        };
        await setDoc(userRef, initialData);
        setUserData(initialData);
      } else {
        const existingData = userSnap.data();
        await updateDoc(userRef, {
          lastLogin: serverTimestamp(),
        });
        setUserData({ ...existingData, lastLogin: new Date() });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${firebaseUser.uid}`);
    }
  };

  useEffect(() => {
    let unsubscribeUser: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await syncUserToFirestore(firebaseUser);
        
        // Listen for real-time user data updates
        if (unsubscribeUser) unsubscribeUser();
        unsubscribeUser = onSnapshot(doc(db, 'users', firebaseUser.uid), (doc) => {
          if (doc.exists()) {
            setUserData(doc.data());
          }
        });
      } else {
        setUser(null);
        setUserData(null);
        if (unsubscribeUser) {
          unsubscribeUser();
          unsubscribeUser = null;
        }
      }
      setLoading(false);
    });

    const unsubscribeSettings = onSnapshot(doc(db, 'appSettings', 'branding'), (doc) => {
      if (doc.exists()) {
        setAppSettings(doc.data());
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSettings();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      console.error("Email login failed:", error);
      throw error;
    }
  };

  const signupWithEmail = async (email: string, pass: string, name: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(userCredential.user, { displayName: name });
      // syncUserToFirestore will be called by onAuthStateChanged
    } catch (error: any) {
      console.error("Signup failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const isAdmin = userData?.role === 'admin' || user?.email === 'adhamyosry56@gmail.com';
  const isBanned = userData?.status === 'banned' && (!userData.banUntil || new Date(userData.banUntil.toDate ? userData.banUntil.toDate() : userData.banUntil) > new Date());
  const isSubscribed = isAdmin || (userData?.subscriptionActive && userData?.subscriptionExpires && new Date(userData.subscriptionExpires.toDate ? userData.subscriptionExpires.toDate() : userData.subscriptionExpires) > new Date());

  const activateCode = async (code: string) => {
    if (!user) throw new Error('يجب تسجيل الدخول أولاً');
    
    try {
      const q = query(collection(db, 'subscriptionCodes'), where('code', '==', code.trim()), where('isUsed', '==', false));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error('كود التفعيل غير صالح أو تم استخدامه من قبل');
      }
      
      const codeDoc = querySnapshot.docs[0];
      const codeData = codeDoc.data();
      const duration = codeData.duration;
      
      let expirationDate = new Date();
      if (userData?.subscriptionExpires && new Date(userData.subscriptionExpires.toDate ? userData.subscriptionExpires.toDate() : userData.subscriptionExpires) > expirationDate) {
        expirationDate = new Date(userData.subscriptionExpires.toDate ? userData.subscriptionExpires.toDate() : userData.subscriptionExpires);
      }
      
      if (duration === 'day') expirationDate.setDate(expirationDate.getDate() + 1);
      else if (duration === 'week') expirationDate.setDate(expirationDate.getDate() + 7);
      else if (duration === 'month') expirationDate.setMonth(expirationDate.getMonth() + 1);
      else if (duration === 'year') expirationDate.setFullYear(expirationDate.getFullYear() + 1);
      
      // Update code status
      await updateDoc(doc(db, 'subscriptionCodes', codeDoc.id), {
        isUsed: true,
        usedBy: user.uid,
        usedAt: serverTimestamp()
      });
      
      // Update user subscription
      await updateDoc(doc(db, 'users', user.uid), {
        subscriptionActive: true,
        subscriptionExpires: Timestamp.fromDate(expirationDate)
      });
      
      // Update local state
      setUserData((prev: any) => ({
        ...prev,
        subscriptionActive: true,
        subscriptionExpires: Timestamp.fromDate(expirationDate)
      }));
      
    } catch (error: any) {
      console.error("Code activation failed:", error);
      throw error;
    }
  };

  const updateUserPhoto = async (photoURL: string) => {
    if (!user) return;
    try {
      await updateProfile(user, { photoURL });
      await updateDoc(doc(db, 'users', user.uid), { photoURL });
      setUserData((prev: any) => ({ ...prev, photoURL }));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const updateAppSettings = async (settings: any) => {
    if (!isAdmin) return;
    try {
      await setDoc(doc(db, 'appSettings', 'branding'), settings, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'appSettings/branding');
    }
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, loginWithGoogle, loginWithEmail, signupWithEmail, logout, isAdmin, isBanned, isSubscribed, appSettings, activateCode, updateUserPhoto, updateAppSettings }}>
      {children}
    </AuthContext.Provider>
  );
};


export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
