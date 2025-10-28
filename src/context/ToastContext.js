import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Animated } from 'react-native';

const ToastContext = createContext(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
};

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState({ visible: false, message: '' });
  const toastAnim = useRef(new Animated.Value(150)).current;

  const showToast = useCallback((message) => {
    setToast({ visible: true, message });
    Animated.spring(toastAnim, { toValue: 0, useNativeDriver: true, bounciness: 5, speed: 12 }).start();
    const timer = setTimeout(() => {
      Animated.spring(toastAnim, { toValue: 150, useNativeDriver: true, bounciness: 5, speed: 12 }).start(() => {
        setToast({ visible: false, message: '' });
      });
    }, 2500);
    return () => clearTimeout(timer);
  }, [toastAnim]);

  const value = { showToast, toast, toastAnim };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
};
