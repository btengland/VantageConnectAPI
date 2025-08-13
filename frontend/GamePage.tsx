import React, { useState, useEffect } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import ExitModal from './components/ExitModal';
import { StatusBar, useColorScheme } from 'react-native';
import PlayerCard from './components/PlayerCard';
import { LinearGradient } from 'expo-linear-gradient';
import CustomText from './components/CustomText';
import { getCharacterColor } from './utils';
import webSocketService from './services/WebSocketService';

// Assume GamePage receives sessionId and a newPlayer object via route params
// e.g., navigation.navigate('Game', { sessionId: '123456', newPlayer: {...} })

const GamePage = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { sessionId, newPlayer } = route.params as any;

  // Define icons once here (placeholders since assets are missing)
  const skillTokenIcons = [null, null, null, null, null, null];

  type Player = { id: string; name: string; turn: boolean; character: string; [key: string]: any; };
  type GameState = {
    sessionId: string;
    challengeDice: number;
    players: Player[];
  };

  const [isOpen, setOpen] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [viewedPlayer, setViewedPlayer] = useState('');
  const [currentPlayerId, setCurrentPlayerId] = useState('');

  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    // --- Connection and Message Handling ---
    webSocketService.connect(sessionId);

    webSocketService.setOnMessageCallback((message) => {
      if (message.action === 'gameStateUpdate') {
        setGameState(message.gameState);
        // If a new player joins, they might be the viewed player
        if (viewedPlayer === '' && message.gameState.players.length > 0) {
            setViewedPlayer(message.gameState.players[0].id)
        }
      }
    });

    // --- Join Session ---
    if (newPlayer) {
        webSocketService.sendMessage('joinSession', { sessionId, playerData: newPlayer });
        setCurrentPlayerId(newPlayer.id);
    }

    return () => {
      webSocketService.disconnect();
    };
  }, [sessionId, newPlayer]);

  const toggleModal = (navigate?: boolean) => {
    if (navigate) {
      (navigation as any).navigate('Home');
    }
    setOpen(!isOpen);
  };

  const handleUpdatePlayer = (updatedPlayer: Player) => {
    // Optimistic update (optional, but good for UX)
    if(gameState) {
        const updatedPlayers = gameState.players.map(p => p.id === updatedPlayer.id ? updatedPlayer : p);
        setGameState({...gameState, players: updatedPlayers});
    }
    // Send update to backend
    webSocketService.sendMessage('updatePlayer', { sessionId, playerData: updatedPlayer });
  };

  const handleUpdateDice = (increment: number) => {
      if (!gameState) return;
      const newDiceValue = Math.max(0, gameState.challengeDice + increment);
      // Optimistic update
      setGameState({...gameState, challengeDice: newDiceValue});
      webSocketService.sendMessage('updateDice', { sessionId, challengeDice: newDiceValue });
  }

  const handleNextTurn = () => {
      webSocketService.sendMessage('nextTurn', { sessionId });
  }

  if (!gameState) {
    return (
      <LinearGradient colors={['#b7c9d0', '#025472']} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="white" />
        <CustomText>Connecting to session...</CustomText>
      </LinearGradient>
    );
  }

  const viewedPlayerObject = gameState.players.find(p => p.id === viewedPlayer);

  return (
    <LinearGradient colors={['#b7c9d0', '#025472']} style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      <View style={styles.main}>
        <Pressable onPress={() => toggleModal(false)} style={styles.closeButton}>
          <CustomText style={styles.closeButtonText}>X</CustomText>
        </Pressable>

        <View style={styles.diceContainer}>
          <CustomText style={styles.mainText} bold>Available Dice:</CustomText>
          <View style={styles.diceControl}>
            <Pressable onPress={() => handleUpdateDice(-1)} style={styles.diceButton}>
              <CustomText style={styles.diceButtonText}>-</CustomText>
            </Pressable>
            <CustomText style={styles.diceValue}>{gameState.challengeDice}</CustomText>
            <Pressable onPress={() => handleUpdateDice(1)} style={styles.diceButton}>
              <CustomText style={styles.diceButtonText}>+</CustomText>
            </Pressable>
          </View>
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.sidebar}>
            {gameState.players.map(player => (
              <View key={player.id} style={styles.innerSidebar}>
                <Pressable
                  onPress={() => setViewedPlayer(player.id)}
                  style={[
                    styles.bubble,
                    { backgroundColor: getCharacterColor(player.character) },
                    player.turn && { borderWidth: 3, borderColor: 'white' },
                  ]}
                >
                  <CustomText style={styles.bubbleText} bold>
                    {player.name?.trim()?.charAt(0)?.toUpperCase() || '?'}
                  </CustomText>
                </Pressable>
                {player.id === viewedPlayer && (
                  <View style={[ styles.triangle, { borderTopColor: getCharacterColor(player.character) }]} />
                )}
              </View>
            ))}
          </View>

          {viewedPlayerObject && (
            <PlayerCard
              player={viewedPlayerObject}
              isCurrentPlayer={viewedPlayerObject.id === currentPlayerId}
              getCharacterColor={getCharacterColor}
              skillTokenIcons={skillTokenIcons}
              onUpdatePlayer={handleUpdatePlayer}
              onEndTurn={handleNextTurn}
            />
          )}
        </View>
      </View>

      <ExitModal isOpen={isOpen} toggleModal={toggleModal} />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#a0c8f0', paddingTop: 50, paddingLeft: 16, paddingRight: 16, paddingBottom: 16 },
  main: { flex: 1 },
  mainText: { fontSize: 24 },
  contentContainer: { flex: 1, flexDirection: 'column' },
  sidebar: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 10, zIndex: 100, marginTop: 16 },
  innerSidebar: { alignItems: 'center' },
  bubble: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center', position: 'relative', zIndex: 10 },
  bubbleText: { color: 'white' },
  diceContainer: { backgroundColor: 'rgba(0, 0, 0, 0.18)', borderRadius: 16, padding: 16, alignSelf: 'center', alignItems: 'center' },
  diceControl: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 8 },
  diceButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
  diceButtonText: { color: 'white', fontSize: 24 },
  diceValue: { fontSize: 24 },
  triangle: { width: 0, height: 0, borderLeftWidth: 10, borderRightWidth: 10, borderTopWidth: 15, marginTop: -2, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  closeButton: { position: 'absolute', top: 0, right: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 200, shadowColor: '#000', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4 },
  closeButtonText: { color: 'white', fontSize: 20, lineHeight: 20 },
});

export default GamePage;
