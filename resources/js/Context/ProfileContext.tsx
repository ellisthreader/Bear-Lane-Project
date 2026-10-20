import React, { createContext, useContext, useState, ReactNode } from "react";

interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  phone?: string;
  bio?: string;
  avatar_url?: string;
  created_at?: string;
  // add other user fields here
}

interface ProfileContextProps {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const ProfileContext = createContext<ProfileContextProps | undefined>(undefined);

interface ProviderProps {
  children: ReactNode;
  initialUser: User;
}

export const ProfileProvider = ({ children, initialUser }: ProviderProps) => {
  const [user, setUser] = useState<User | null>(initialUser ?? null);

  return (
    <ProfileContext.Provider value={{ user, setUser }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) throw new Error("useProfile must be used within a ProfileProvider");
  return context;
};
