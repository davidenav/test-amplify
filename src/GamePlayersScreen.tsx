// GamePlayersScreen.tsx
import React, {useLayoutEffect, useEffect, useState} from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { generateClient } from 'aws-amplify/api';
import type { SelectionSet } from 'aws-amplify/data';
import { type Schema } from '../amplify/data/resource';
import { RootStackParamList } from './types';
import {
  calcGameStats,
  calcPlayersStats,
  gameType,
  PlayerType,
  playerSelectionSet, 
  gameSelectionSet,
  gameSelectionSeWithDebts,
  gameWithDebtType,
} from './Logic';

type Props = NativeStackScreenProps<RootStackParamList, 'GamePlayers'>;
const client = generateClient<Schema>();

const GamePlayersScreen: React.FC<Props> = ({ route, navigation }) => {
    const { gameId } = route.params;
    const [game, setGame] = useState<gameWithDebtType>();
    

    useEffect(() => {
            const fetchGame = async () => {
                try {
                    const gameResult = await client.models.Game.get({
                        id: gameId,
                    }, 
                    {selectionSet: gameSelectionSeWithDebts});
    
                    if (!gameResult.data) {
                        console.error('Game not found');
                        return;
                    }
                    setGame(gameResult.data);
                } catch (error) {
                    console.error('Error fetching games:', error);
                }
            };
    
            fetchGame();
        }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: `${game?.name} - Statistics`,
    });
  }, [navigation, game?.name]);

  const renderPlayer = ({ item }: { item: PlayerType }) => {
          const playerStats = calcPlayersStats(item);
          return (<View style={styles.playerItem}>
              <Text style={styles.playerName}>{item.player.name}</Text>
              <Text style={styles.playerName}>
                  Invested: {playerStats.invested} {'\n'}
                  Returned: {playerStats.returned} {'\n'}
                  Total: {playerStats.total}
              </Text>
          </View>);
      };;

  return (
    game && (<View style={styles.container}>
      <Text style={styles.modalTitle}>Players</Text>
      
      <FlatList
          data={game?.players ?? []}
          renderItem={renderPlayer}
          keyExtractor={(item) => item.id}
          style={styles.playersList}
      />
      
      <Text style={styles.modalTitle}>Debts</Text>
                          
      <FlatList
          data={game.gameDebts}
          renderItem={({ item }) => (
              <View style={styles.modalPlayerItem}>
                  <Text style={styles.modalPlayerName}>
                      {item.giver?.player?.name ?? "Pot"} owes {item.amount} to {item.receiver.player.name}
                  </Text>
              </View>
          )}
          keyExtractor={(item, index) => index.toString()}
      />
    </View>)
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  playersList: {
    flex: 1,
  },
  playerItem: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
    justifyContent: 'space-between',
},
playerName: {
    fontSize: 16,
    fontWeight: 'bold',
},
modalTitle: {
  fontSize: 20,
  fontWeight: 'bold',
  marginBottom: 16,
},
modalPlayerItem: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 12,
  borderBottomWidth: 1,
  borderBottomColor: '#eee',
},
modalPlayerName: {
  fontSize: 16,
},
modalPlayerDebt: {
  fontSize: 16,
  color: 'red',
},
});

export default GamePlayersScreen;
