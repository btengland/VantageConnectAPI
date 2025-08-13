import React from 'react';
import { View } from 'react-native';
import { Picker } from '@react-native-picker/picker';

const IconPicker = ({ options, selectedValue, onValueChange }) => {
  return (
    <View>
      <Picker selectedValue={selectedValue} onValueChange={onValueChange}>
        {options.map((option) => (
          <Picker.Item key={option.value} label={option.label} value={option.value} />
        ))}
      </Picker>
    </View>
  );
};

export default IconPicker;
