import React from 'react';
import { View } from 'react-native';
import { usePrefs } from '../context/PreferencesContext';
import Ionicons from 'react-native-vector-icons/Ionicons';


// Using an Icon instead of an image asset to avoid asset management.
export default function Verified({ size = 14 }) {
  const { styles } = usePrefs();
  return (
     <View style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#F7B400',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 4,
     }}>
        <Ionicons name="checkmark" size={size * 0.7} color="#fff" />
     </View>
  );
}