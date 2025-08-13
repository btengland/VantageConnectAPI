import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  ScrollView,
  Animated,
  Image,
  Easing,
  KeyboardAvoidingView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { SharedStyles } from './SharedStyles';
import CustomText from './CustomText';
import IconPicker from './IconPicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CHARACTERS, ESCAPE_PODS, IMPACT_SYMBOLS } from '../constants';
import { getOrdinal, lightenColor } from '../utils';

type SkillToken = { quantity: number; };
type ImpactDiceSlot = { symbol: string; checked: boolean; };
type Player = {
  id: string; name: string; character: string; escapePod: string; location: string;
  skillTokens: SkillToken[]; turn: boolean; journalText: string;
  statuses: { heart: number; star: number; 'timer-sand-full': number; };
  impactDiceSlots: ImpactDiceSlot[];
};

type PlayerCardProps = {
  player: Player;
  isCurrentPlayer: boolean;
  getCharacterColor: (characterText: string) => string;
  skillTokenIcons: any[];
  onUpdatePlayer: (player: Player) => void;
  onEndTurn: () => void;
};

function PlayerCard({
  player,
  isCurrentPlayer,
  getCharacterColor,
  skillTokenIcons,
  onUpdatePlayer,
  onEndTurn
}: PlayerCardProps) {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // Handler to update the player state
  const handleUpdate = (field: keyof Player, value: any) => {
    const updatedPlayer = { ...player, [field]: value };
    onUpdatePlayer(updatedPlayer);
  };

  const handleStatusChange = (status: 'heart' | 'star' | 'timer-sand-full', change: 1 | -1) => {
    const currentLevel = player.statuses[status];
    const newLevel = Math.max(0, Math.min(6, currentLevel + change));
    const newStatuses = { ...player.statuses, [status]: newLevel };
    onUpdatePlayer({ ...player, statuses: newStatuses });
  };

  const handleSkillTokenChange = (index: number, change: 1 | -1) => {
      const newTokens = [...player.skillTokens];
      newTokens[index].quantity = Math.max(0, newTokens[index].quantity + change);
      onUpdatePlayer({ ...player, skillTokens: newTokens });
  }

  // ... (other handlers like impact slots would also call onUpdatePlayer)

  const lighterBg = lightenColor(getCharacterColor(player.character), 0.8);

  useEffect(() => {
    if (player.turn && isCurrentPlayer) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: false }),
            Animated.timing(pulseAnim, { toValue: 0, duration: 1500, useNativeDriver: false }),
          ]),
        ).start();
    } else {
        pulseAnim.setValue(0);
        pulseAnim.stopAnimation();
    }
    return () => pulseAnim.stopAnimation();
  }, [pulseAnim, player.turn, isCurrentPlayer]);

  const renderPickerItems = (items: string[]) =>
    items.map(item => <Picker.Item key={item} label={item} value={item} />);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={150}>
      <View style={styles.cardContainer}>
        <ScrollView contentContainerStyle={[styles.card, { backgroundColor: lighterBg }]}>
          <CustomText style={styles.sectionHeader} small bold>{player.name}'s Card</CustomText>

          {player.turn && (
            <View style={styles.buttonContainer}>
              <View style={[styles.turnTextContainer, styles.myTurnBackground]}>
                <CustomText style={styles.turnText} small bold>It's your turn</CustomText>
              </View>
              {isCurrentPlayer && (
                 <Pressable onPress={onEndTurn}>
                    <CustomText style={SharedStyles.button} small bold>Done</CustomText>
                 </Pressable>
              )}
            </View>
          )}

          <View style={styles.row}>
            <CustomText style={styles.label} small bold>Player Name:</CustomText>
            <TextInput
              style={styles.value}
              defaultValue={player.name}
              placeholder="Enter your name"
              editable={isCurrentPlayer}
              onChangeText={(text) => handleUpdate('name', text)}
            />
          </View>

          <View style={styles.row}>
            <CustomText style={styles.label} small bold>Character:</CustomText>
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={player.character} enabled={isCurrentPlayer} onValueChange={(val) => handleUpdate('character', val)}>
                {renderPickerItems(CHARACTERS)}
              </Picker>
            </View>
          </View>

          {/* ... Other pickers and inputs would be similarly disabled ... */}

          <View style={{ marginTop: 16 }}>
            <CustomText style={styles.subHeader} small bold>Skill Tokens</CustomText>
            <View style={styles.skillTokenGrid}>
              {player.skillTokens.map((token, index) => (
                <View key={index} style={styles.skillTokenBox}>
                   <View style={styles.counterContainer}>
                    <Pressable style={styles.tokenButton} disabled={!isCurrentPlayer} onPress={() => handleSkillTokenChange(index, -1)}>
                      <CustomText style={styles.tokenButtonText}>-</CustomText>
                    </Pressable>
                    <CustomText style={styles.tokenQuantity}>{token.quantity}</CustomText>
                    <Pressable style={styles.tokenButton} disabled={!isCurrentPlayer} onPress={() => handleSkillTokenChange(index, 1)}>
                      <CustomText style={styles.tokenButtonText}>+</CustomText>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* ... All other inputs and controls should follow this pattern, using `isCurrentPlayer` to enable/disable ... */}

        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  cardContainer: { borderRadius: 10, overflow: 'hidden', flex: 1 },
  card: { padding: 24, backgroundColor: 'white' },
  sectionHeader: { textAlign: 'center', borderBottomWidth: 1, marginBottom: 16 },
  subHeader: { textAlign: 'center', textDecorationLine: 'underline', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  label: { flex: 1, fontSize: 14 },
  value: { width: 210, height: 60, backgroundColor: '#eee', borderRadius: 6, paddingHorizontal: 8, justifyContent: 'center' },
  locationContainer: { justifyContent: 'center', alignItems: 'center', marginTop: 12, gap: 6, width: '100%' },
  locationInputWrapper: { backgroundColor: '#025472', borderRadius: 6, paddingVertical: 14, paddingHorizontal: 30 },
  locationInput: { width: 90, fontSize: 38, fontFamily: 'Roboto-Bold', backgroundColor: 'transparent', textAlign: 'center', paddingVertical: 0 },
  pickerWrapper: { width: 210, backgroundColor: '#eee', borderRadius: 6, overflow: 'hidden' },
  pickerAndroid: { height: 60, color: '#000' },
  pickerItem: { fontSize: 14, fontFamily: 'Roboto-Regular' },
  buttonContainer: { alignItems: 'center', marginBottom: 16, backgroundColor: '#eee', borderRadius: 16, padding: 16, alignSelf: 'center' },
  turnTextContainer: { backgroundColor: '#f0f4f8', paddingVertical: 8, borderRadius: 12, marginBottom: 10, alignSelf: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2, minWidth: '60%' },
  myTurnBackground: { backgroundColor: '#a5f0a8' },
  turnText: { textAlign: 'center' },
  skillTokenGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  skillTokenBox: { width: '48%', backgroundColor: '#eee', padding: 8, marginVertical: 4, borderRadius: 8, alignItems: 'center' },
  counterContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 5, alignItems: 'center' },
  tokenButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#444', alignItems: 'center', justifyContent: 'center' },
  tokenButtonText: { color: 'white', fontSize: 20 },
  tokenQuantity: { fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
});

export default PlayerCard;
