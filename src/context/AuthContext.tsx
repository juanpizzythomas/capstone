
// import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// import { User, LoginCredentials, RegisterData } from '@/types/user';
// import { userService } from '@/services/userService';

// interface AuthContextType {
//   user: User | null;
//   login: (credentials: LoginCredentials) => Promise<boolean>;
//   register: (data: RegisterData) => Promise<boolean>;
//   logout: () => void;
//   isLoading: boolean;
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
//   const [user, setUser] = useState<User | null>(null);
//   const [isLoading, setIsLoading] = useState(true);

//   useEffect(() => {
//     const savedUser = localStorage.getItem('currentUser');
//     const token = localStorage.getItem('authToken');
    
//     if (savedUser && token) {
//       setUser(JSON.parse(savedUser));
//     }
//     setIsLoading(false);
//   }, []);

//   const login = async (credentials: LoginCredentials): Promise<boolean> => {
//     setIsLoading(true);
    
//     try {
//       const { user: loggedInUser, token } = await userService.login(credentials);
      
//       if (loggedInUser && loggedInUser.isApproved) {
//         setUser(loggedInUser);
//         localStorage.setItem('currentUser', JSON.stringify(loggedInUser));
//         localStorage.setItem('authToken', token);
//         setIsLoading(false);
//         return true;
//       }
//     } catch (error) {
//       console.error('Login error:', error);
//     }
    
//     setIsLoading(false);
//     return false;
//   };

//   const register = async (data: RegisterData): Promise<boolean> => {
//     setIsLoading(true);
    
//     try {
//       const response = await userService.register(data);
//       setIsLoading(false);
//       return response.success;
//     } catch (error) {
//       console.error('Registration error:', error);
//       setIsLoading(false);
//       return false;
//     }
//   };

//   const logout = () => {
//     setUser(null);
//     localStorage.removeItem('currentUser');
//     localStorage.removeItem('authToken');
//   };

//   return (
//     <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
//       {children}
//     </AuthContext.Provider>
//   );
// };

// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (context === undefined) {
//     throw new Error('useAuth must be used within an AuthProvider');
//   }
//   return context;
// };

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginCredentials, RegisterData } from '@/types/user';
import { userService } from '@/services/userService';

interface AuthContextType {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = () => {
      const savedUser = localStorage.getItem('currentUser');
      const token = localStorage.getItem('authToken');

      if (savedUser && token) {
        setUser(JSON.parse(savedUser));
      }

      // ✅ Set loading selesai setelah pengecekan
      setIsLoading(false);
    };

    loadUser();

    const handleUserUpdate = () => {
      loadUser();
    };

    window.addEventListener('userUpdated', handleUserUpdate);

    return () => {
      window.removeEventListener('userUpdated', handleUserUpdate);
    };
  }, []);

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    setIsLoading(true);

    try {
      const { user: loggedInUser, token } = await userService.login(credentials);

      if (loggedInUser && loggedInUser.isApproved) {
        setUser(loggedInUser);
        localStorage.setItem('currentUser', JSON.stringify(loggedInUser));
        localStorage.setItem('authToken', token);
        setIsLoading(false);
        return true;
      }
    } catch (error) {
      console.error('Login error:', error);
    }

    setIsLoading(false);
    return false;
  };

  const register = async (data: RegisterData): Promise<boolean> => {
    setIsLoading(true);

    try {
      const response = await userService.register(data);
      setIsLoading(false);
      return response.success;
    } catch (error) {
      console.error('Registration error:', error);
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
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
