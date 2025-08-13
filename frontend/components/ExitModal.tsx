import React from 'react';
import { View, Text, Modal } from 'react-native';

const ExitModal = ({ isOpen, toggleModal }) => {
  return (
    <Modal visible={isOpen} transparent={true}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{ padding: 20, backgroundColor: 'white', borderRadius: 10 }}>
          <Text>Exit Modal</Text>
          <Text onPress={() => toggleModal(true)}>Confirm Exit</Text>
          <Text onPress={() => toggleModal(false)}>Cancel</Text>
        </View>
      </View>
    </Modal>
  );
};

export default ExitModal;
