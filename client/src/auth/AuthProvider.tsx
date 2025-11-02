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
  EmailAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithCredential,
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
  email?: string | null;
  password?: string | null;
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

      let currentUser = auth.currentUser;
      let credentialResult: UserCredential | null = null;

      if (phoneCredential) {
        const hasPhoneProvider = currentUser?.providerData.some((provider) => provider.providerId === 'phone');

        if (!currentUser) {
          credentialResult = await signInWithCredential(auth, phoneCredential);
          currentUser = credentialResult.user;
        } else if (!hasPhoneProvider) {
          try {
            credentialResult = await linkWithCredential(currentUser, phoneCredential);
            currentUser = credentialResult.user;
          } catch (error) {
            const code = (error as FirebaseError).code;
            if (code !== 'auth/provider-already-linked') {
              throw error;
            }
          }
        }
      }

      if (!currentUser) {
        throw new Error('Unable to create account without a verified phone number.');
      }

      const normalizedEmail = email?.trim() ?? '';
      const hasEmail = normalizedEmail.length > 0;
      const hasPassword = Boolean(password && password.length > 0);

      if (hasEmail && !hasPassword) {
        throw new Error('Password is required when email is provided.');
      }

      if (hasEmail) {
        const emailCredential = EmailAuthProvider.credential(normalizedEmail, password!);
        const linkedCredential = await linkWithCredential(currentUser, emailCredential);
        if (name && linkedCredential.user.displayName !== name) {
          await updateProfile(linkedCredential.user, { displayName: name });
        }
        return linkedCredential;
      }

      if (name && currentUser.displayName !== name) {
        await updateProfile(currentUser, { displayName: name });
      }

      if (credentialResult) {
        return credentialResult;
      }

      return {
        user: currentUser,
        providerId: currentUser.providerId ?? null,
        operationType: 'signIn',
      } as UserCredential;
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
