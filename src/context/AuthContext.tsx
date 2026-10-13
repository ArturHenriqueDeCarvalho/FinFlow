import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous?: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => void;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verifica se havia uma sessão de convidado ativa no localStorage
    const savedGuest = localStorage.getItem('finpulse_guest_session');
    if (savedGuest) {
      try {
        const guestData = JSON.parse(savedGuest);
        if (guestData && guestData.uid) {
          setUser(guestData);
          setIsLoading(false);
        }
      } catch {
        localStorage.removeItem('finpulse_guest_session');
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async currentUser => {
      if (currentUser) {
        // Remove sessão temporária caso faça login real
        localStorage.removeItem('finpulse_guest_session');
        setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
          isAnonymous: currentUser.isAnonymous,
        });
        setIsLoading(false);

        // Registra ou atualiza perfil no Firestore
        const userRef = doc(db, 'users', currentUser.uid);
        try {
          await setDoc(
            userRef,
            {
              email: currentUser.email || '',
              displayName: currentUser.displayName || 'Usuário FinPulse',
              photoURL: currentUser.photoURL || '',
              lastLoginAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}`);
        }
      } else {
        // Se não houver Firebase user e nem sessão de convidado
        if (!localStorage.getItem('finpulse_guest_session')) {
          setUser(null);
        }
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Erro no login com Google:', error);
      throw error;
    }
  };

  const signInAsGuest = () => {
    const guestUser: AppUser = {
      uid: 'guest_' + Math.random().toString(36).substring(2, 10),
      email: 'visitante@finpulse.local',
      displayName: 'Usuário Convidado (Modo Local)',
      photoURL: '',
      isAnonymous: true,
    };
    localStorage.setItem('finpulse_guest_session', JSON.stringify(guestUser));
    setUser(guestUser);
  };

  const logOut = async () => {
    localStorage.removeItem('finpulse_guest_session');
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
    } catch (error: any) {
      console.error('Erro ao encerrar sessão Firebase:', error);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signInWithGoogle, signInAsGuest, logOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de AuthProvider');
  }
  return context;
};

