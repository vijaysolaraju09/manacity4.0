import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type PhoneAuthCredential,
  type User,
  type UserCredential,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { auth } from '@/firebase/init';

const REMEMBER_KEY = 'manacity:auth:remember';

type SignInArgs = {
  email: string;
  password: string;
};

type SignUpArgs = {
  name: string;
  email: string;
  password: string;
  phoneCredential?: PhoneAuthCredential | null;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  rememberMe: boolean;
  signIn: (args: SignInArgs) => Promise<UserCredential>;
  signOut: () => Promise<void>;
  signUpWithEmailPasswordAndLinkPhone: (args: SignUpArgs) => Promise<UserCredential>;
  sendPasswordReset: (email: string) => Promise<void>;
  setRemember: (remember: boolean) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const resolveRememberDefault = () => {
  if (typeof window === 'undefined') return false;
  const stored = window.localStorage.getItem(REMEMBER_KEY);
  return stored === 'true';
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [rememberMe, setRememberState] = useState<boolean>(resolveRememberDefault);

  useEffect(() => {
    const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    setPersistence(auth, persistence).catch((error) => {
      console.warn('Failed to set auth persistence', error);
    });
  }, [rememberMe]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = useCallback(
    async ({ email, password }: SignInArgs) => {
      const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistence);
      return signInWithEmailAndPassword(auth, email, password);
    },
    [rememberMe],
  );

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  const signUpWithEmailPasswordAndLinkPhone = useCallback(
    async ({ name, email, password, phoneCredential }: SignUpArgs) => {
      const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistence);

      const currentUser = auth.currentUser;
      const hasPhoneProvider = currentUser?.providerData.some((provider) => provider.providerId === 'phone');

      if (currentUser) {
        if (phoneCredential && !hasPhoneProvider) {
          try {
            await linkWithCredential(currentUser, phoneCredential);
          } catch (error) {
            const code = (error as FirebaseError).code;
            if (code !== 'auth/provider-already-linked') {
              throw error;
            }
          }
        }

        if (hasPhoneProvider) {
          const emailCredential = EmailAuthProvider.credential(email, password);
          const linkedCredential = await linkWithCredential(currentUser, emailCredential);
          if (name && currentUser.displayName !== name) {
            await updateProfile(linkedCredential.user, { displayName: name });
          }
          return linkedCredential;
        }
      }

      const createdCredential = await createUserWithEmailAndPassword(auth, email, password);

      if (name) {
        await updateProfile(createdCredential.user, { displayName: name });
      }

      if (phoneCredential) {
        try {
          await linkWithCredential(createdCredential.user, phoneCredential);
        } catch (error) {
          const code = (error as FirebaseError).code;
          if (code === 'auth/credential-already-in-use') {
            await deleteUser(createdCredential.user);
          }
          throw error;
        }
      }

      return createdCredential;
    },
    [rememberMe],
  );

  const setRemember = useCallback(async (remember: boolean) => {
    setRememberState(remember);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(REMEMBER_KEY, remember ? 'true' : 'false');
    }
    const persistence = remember ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistence);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      rememberMe,
      signIn,
      signOut,
      signUpWithEmailPasswordAndLinkPhone,
      sendPasswordReset,
      setRemember,
    }),
    [loading, rememberMe, sendPasswordReset, signIn, signOut, signUpWithEmailPasswordAndLinkPhone, setRemember, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
