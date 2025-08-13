import React from 'react';
import { Text, StyleSheet } from 'react-native';

const CustomText = (props) => {
  const { style, children, bold, small } = props;
  const textStyle = [
    styles.default,
    bold && styles.bold,
    small && styles.small,
    style,
  ];
  return <Text style={textStyle}>{children}</Text>;
};

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    fontFamily: 'Roboto-Regular', // Assuming this font exists
  },
  bold: {
    fontFamily: 'Roboto-Bold', // Assuming this font exists
  },
  small: {
    fontSize: 12,
  }
});

export default CustomText;
