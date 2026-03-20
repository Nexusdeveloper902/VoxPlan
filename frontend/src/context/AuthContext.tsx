import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { setAuthToken } from '../api/client';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user: any;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const rawDomain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN || '';
const auth0Domain = rawDomain.startsWith('http') ? rawDomain : `https://${rawDomain}`;
const clientId = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const redirectUri = AuthSession.makeRedirectUri();
  console.log('Redirect URI (Add this to Auth0 Allowed Callbacks):', redirectUri);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: clientId || '',
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      responseType: AuthSession.ResponseType.Token,
      extraParams: {
        audience: process.env.EXPO_PUBLIC_AUTH0_AUDIENCE || '',
      }
    },
    { authorizationEndpoint: `${auth0Domain}/authorize` }
  );

  useEffect(() => {
    console.log('AuthSession Response:', response?.type, response);
    
    if (response?.type === 'success') {
      const { access_token } = response.params;
      console.log('Access Token received');
      setAccessToken(access_token);
      setAuthToken(access_token);
      
      // Fetch user info
      fetch(`${auth0Domain}/userinfo`, {
        headers: { Authorization: `Bearer ${access_token}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch user info: ' + res.status);
          return res.json();
        })
        .then((userData) => {
          console.log('User data fetched successfully');
          setUser(userData);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error('User info fetch error:', err);
          setIsLoading(false);
        });
    } else if (response?.type === 'error') {
      console.error('Auth0 Error:', response.error, response.params);
      setIsLoading(false);
    } else if (response?.type === 'dismiss') {
      console.log('Login dismissed by user');
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [response]);

  const login = async () => {
    setIsLoading(true);
    await promptAsync();
  };

  const logout = async () => {
    setUser(null);
    setAccessToken(null);
  };

  const getAccessToken = async () => accessToken;

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, getAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
