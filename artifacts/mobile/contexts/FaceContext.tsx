import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const FACE_KEY = "napless_face_v1";
const EMERGENCY_CODE_KEY = "napless_emergency_code";
const DEFAULT_EMERGENCY_CODE = "NAPLESS-EMERGENCY-2024-OVERRIDE";

interface FaceContextType {
  isRegistered: boolean;
  isLoading: boolean;
  registerFace: () => Promise<void>;
  verifyFace: () => Promise<boolean>;
  clearFace: () => Promise<void>;
  emergencyCode: string;
}

const FaceContext = createContext<FaceContextType | undefined>(undefined);

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === "web") return localStorage.getItem(key);
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function secureDelete(key: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export function FaceProvider({ children }: { children: ReactNode }) {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await secureGet(FACE_KEY);
        setIsRegistered(data !== null);
      } catch {
        setIsRegistered(false);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const registerFace = async () => {
    const token = `face_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await secureSet(FACE_KEY, token);
    setIsRegistered(true);
  };

  const verifyFace = async (): Promise<boolean> => {
    const stored = await secureGet(FACE_KEY);
    return stored !== null;
  };

  const clearFace = async () => {
    await secureDelete(FACE_KEY);
    setIsRegistered(false);
  };

  return (
    <FaceContext.Provider
      value={{
        isRegistered,
        isLoading,
        registerFace,
        verifyFace,
        clearFace,
        emergencyCode: DEFAULT_EMERGENCY_CODE,
      }}
    >
      {children}
    </FaceContext.Provider>
  );
}

export function useFace() {
  const ctx = useContext(FaceContext);
  if (!ctx) throw new Error("useFace must be used within FaceProvider");
  return ctx;
}
