import React from 'react';
import { View, StyleSheet } from 'react-native';

interface LogoProps {
  size?: number;
  inverted?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 80, inverted = false }) => {
  const bgColor = inverted ? '#FFFFFF' : '#0B44CD';
  const iconColor = inverted ? '#0B44CD' : '#FFFFFF';
  
  return (
    <View style={[
      styles.container,
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bgColor,
        shadowColor: bgColor,
      }
    ]}>
      <View style={{
        width: size * 0.55,
        height: size * 0.55,
        flexDirection: 'row',
        flexWrap: 'wrap',
      }}>
        {/* Top Left */}
        <View style={{
          width: '50%',
          height: '50%',
          borderTopLeftRadius: size * 0.12,
          borderBottomRightRadius: size * 0.15,
          backgroundColor: iconColor,
        }} />
        {/* Top Right */}
        <View style={{
          width: '50%',
          height: '50%',
          borderTopRightRadius: size * 0.12,
          borderBottomLeftRadius: size * 0.15,
          backgroundColor: iconColor,
        }} />
        {/* Bottom Left */}
        <View style={{
          width: '50%',
          height: '50%',
          borderBottomLeftRadius: size * 0.12,
          borderTopRightRadius: size * 0.15,
          backgroundColor: iconColor,
        }} />
        {/* Bottom Right */}
        <View style={{
          width: '50%',
          height: '50%',
          borderBottomRightRadius: size * 0.12,
          borderTopLeftRadius: size * 0.15,
          backgroundColor: iconColor,
        }} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
});
