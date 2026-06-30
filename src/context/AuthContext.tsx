import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User as FirebaseUser, signInWithPopup, signOut, signInAnonymously, GoogleAuthProvider } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider, handleFirestoreError, OperationType } from "../firebase";
import { UserProfile, UserRole } from "../types";

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  loginAsStaff: (id: string, pass: string) => Promise<boolean>;
  logout: () => Promise<void>;
  toggleRole: () => Promise<void>;
  updateProfileData: (data: { displayName?: string; photoURL?: string }) => Promise<void>;
  googleAccessToken: string | null;
  reauthorizeGmail: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);

  // Sync / create profile on sign in
  const syncUserProfile = async (firebaseUser: FirebaseUser) => {
    const userDocRef = doc(db, "users", firebaseUser.uid);
    try {
      const userDoc = await getDoc(userDocRef);
      const isStaffSession = localStorage.getItem("is_staff_session") === "true";
      
      if (!userDoc.exists()) {
        const newProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || (isStaffSession ? "officer123@swachhbharat.gov.in" : ""),
          displayName: firebaseUser.displayName || (isStaffSession ? "Swachh Sanitation Officer" : "Anonymous Resident"),
          photoURL: firebaseUser.photoURL || (isStaffSession ? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200" : undefined),
          role: isStaffSession ? "staff" : "user", // Default role
          createdAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, {
          ...newProfile,
          createdAt: serverTimestamp(),
        });
        setUserProfile(newProfile);
      } else {
        const data = userDoc.data();
        let currentRole = data.role as UserRole;
        if (isStaffSession && currentRole !== "staff") {
          currentRole = "staff";
          await setDoc(userDocRef, { role: "staff" }, { merge: true });
        }
        setUserProfile({
          uid: data.uid,
          email: data.email || (isStaffSession ? "officer123@swachhbharat.gov.in" : ""),
          displayName: data.displayName || (isStaffSession ? "Swachh Sanitation Officer" : ""),
          photoURL: data.photoURL || (isStaffSession ? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200" : undefined),
          role: currentRole,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setLoading(true);
      if (user) {
        setCurrentUser(user);
        await syncUserProfile(user);
      } else {
        const storedMock = localStorage.getItem("mock_staff_user");
        if (storedMock) {
          try {
            const parsed = JSON.parse(storedMock);
            setCurrentUser(parsed);
            setUserProfile({
              uid: parsed.uid,
              email: parsed.email,
              displayName: parsed.displayName,
              photoURL: parsed.photoURL,
              role: "staff",
              createdAt: new Date().toISOString(),
            });
          } catch {
            setCurrentUser(null);
            setUserProfile(null);
          }
        } else {
          setCurrentUser(null);
          setUserProfile(null);
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async () => {
    try {
      localStorage.removeItem("mock_staff_user");
      localStorage.removeItem("is_staff_session");
      googleProvider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleAccessToken(credential.accessToken);
      }
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  const reauthorizeGmail = async (): Promise<string | null> => {
    try {
      const gmailProvider = new GoogleAuthProvider();
      gmailProvider.addScope("https://www.googleapis.com/auth/gmail.send");
      gmailProvider.setCustomParameters({ prompt: "consent" });
      const result = await signInWithPopup(auth, gmailProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleAccessToken(credential.accessToken);
        return credential.accessToken;
      }
    } catch (err) {
      console.error("Reauthorize Gmail failed:", err);
    }
    return null;
  };

  const loginAsStaff = async (id: string, pass: string): Promise<boolean> => {
    if (id.trim() === "staff123" && pass.trim() === "swachh2026") {
      try {
        localStorage.setItem("is_staff_session", "true");
        const userCredential = await signInAnonymously(auth);
        
        const mockUser = {
          uid: userCredential.user.uid,
          displayName: "Swachh Sanitation Officer",
          email: "officer123@swachhbharat.gov.in",
          photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
        } as any;
        
        const mockProfile: UserProfile = {
          uid: userCredential.user.uid,
          email: "officer123@swachhbharat.gov.in",
          displayName: "Swachh Sanitation Officer",
          photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
          role: "staff",
          createdAt: new Date().toISOString(),
        };

        // Write to firestore users collection
        const userDocRef = doc(db, "users", userCredential.user.uid);
        await setDoc(userDocRef, {
          uid: userCredential.user.uid,
          email: "officer123@swachhbharat.gov.in",
          displayName: "Swachh Sanitation Officer",
          photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
          role: "staff",
          createdAt: serverTimestamp(),
        });
        
        setCurrentUser(userCredential.user);
        setUserProfile(mockProfile);
        localStorage.setItem("mock_staff_user", JSON.stringify(mockUser));
        return true;
      } catch (err) {
        console.error("Staff Firebase anonymous login failed, falling back to local mock:", err);
        // Fallback local mock to keep app starting and usable even if anonymous login provider is disabled in Firebase
        const localUid = "staff_mock_123";
        const mockUser = {
          uid: localUid,
          displayName: "Swachh Sanitation Officer",
          email: "officer123@swachhbharat.gov.in",
          photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
        } as any;
        
        const mockProfile: UserProfile = {
          uid: localUid,
          email: "officer123@swachhbharat.gov.in",
          displayName: "Swachh Sanitation Officer",
          photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
          role: "staff",
          createdAt: new Date().toISOString(),
        };
        
        setCurrentUser(mockUser);
        setUserProfile(mockProfile);
        localStorage.setItem("mock_staff_user", JSON.stringify(mockUser));
        return true;
      }
    }
    return false;
  };

  const logout = async () => {
    try {
      localStorage.removeItem("mock_staff_user");
      localStorage.removeItem("is_staff_session");
      await signOut(auth);
      setCurrentUser(null);
      setUserProfile(null);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const toggleRole = async () => {
    if (!currentUser || !userProfile) return;
    const newRole: UserRole = userProfile.role === "user" ? "staff" : "user";
    const userDocRef = doc(db, "users", currentUser.uid);

    try {
      await updateDoc(userDocRef, { role: newRole });
      setUserProfile((prev) => prev ? { ...prev, role: newRole } : null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const updateProfileData = async (data: { displayName?: string; photoURL?: string }) => {
    if (!currentUser) return;

    // Handle mock staff user
    if (currentUser.uid === "staff_mock_123") {
      const updatedMock = {
        ...currentUser,
        displayName: data.displayName || currentUser.displayName,
        photoURL: data.photoURL || currentUser.photoURL,
      };
      setCurrentUser(updatedMock);
      localStorage.setItem("mock_staff_user", JSON.stringify(updatedMock));
      setUserProfile((prev) => prev ? {
        ...prev,
        displayName: data.displayName || prev.displayName,
        photoURL: data.photoURL || prev.photoURL,
      } : null);
      return;
    }

    const userDocRef = doc(db, "users", currentUser.uid);
    try {
      await updateDoc(userDocRef, data);
      setUserProfile((prev) => prev ? {
        ...prev,
        displayName: data.displayName || prev.displayName,
        photoURL: data.photoURL || prev.photoURL,
      } : null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      userProfile,
      loading,
      login,
      loginAsStaff,
      logout,
      toggleRole,
      updateProfileData,
      googleAccessToken,
      reauthorizeGmail
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
