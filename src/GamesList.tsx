import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet, TouchableOpacity } from 'react-native';
import { useIsFocused } from "@react-navigation/native";
import { useAuthenticator } from '@aws-amplify/ui-react-native';
import { generateClient } from 'aws-amplify/api';
import { type Schema } from '../amplify/data/resource';
import type { SelectionSet } from 'aws-amplify/data';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';

// Type for a game item
interface GameWrapper {
    id: string;
    name: string | null;
    date: string | null;
    state: string | null;
}

type Props = NativeStackScreenProps<RootStackParamList, 'GamesList'>;

const client = generateClient<Schema>();

const gamesSelectionSet = ['email', 'player.id', 'player.name', 'player.games.game.id', 'player.games.game.name', 'player.games.game.date', 'player.games.game.state'] as const;
type GamesType = SelectionSet<Schema['UserProfile']['type'], typeof gamesSelectionSet>;

const GamesList: React.FC<Props> = ({ navigation }) => {
  const isFocused = useIsFocused();
  const { user } = useAuthenticator();
  const [games, setGames] = useState<GamesType>();;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGames = async () => {
        if (user?.signInDetails?.loginId) {
          console.log('Fetching games for user:', user.signInDetails?.loginId);
            try {
                // First get the user profile
                const userProfileResult = await client.models.UserProfile.get({
                    email: user.signInDetails?.loginId,
                }, { selectionSet: gamesSelectionSet});

                if (!userProfileResult.data || userProfileResult.errors) {
                    console.error('No user profile found:', userProfileResult.errors);
                    throw new Error('No user profile found');
                }

                setGames(userProfileResult.data);
            } catch (error) {
                console.error('Error fetching games:', error);
            } finally {
                setLoading(false);
            }
        };

    }

    fetchGames();

  }, [isFocused]);

  const renderItem = ({ item }: { item: GameWrapper }) => (
    <TouchableOpacity 
      style={[styles.gameItem, item.state === 'Open' && { backgroundColor: 'lightgreen' }]}
      onPress={() => item.state !== 'Open' ? navigation.navigate('GamePlayers', { gameId: item.id }) : navigation.navigate('NewGame', { gameId: item.id })}
    >
      <Text style={styles.gameName}>{item.name}</Text>
      <Text style={styles.gameDate}>{item.date}</Text>
    </TouchableOpacity>
  );

  const handleNewGame = async () => {
    const gameName = 'New Game'; // Define the game name
    const date = new Date(Date.now());; // Define the date
    const dateString = date.toISOString().split('T')[0];
    const ownerId = games?.player.id ?? ''; // Define the owner ID

    try {
      const newGame = await client.models.Game.create({
        name: gameName,
        date: dateString,
        state: 'Open',
        moneyChipRatio: 2, // Default value
        ownerId: ownerId,
      });
      if (!newGame.data || newGame.errors) {
        console.error('Error creating new game:', newGame.errors);
        return;
      }
      const newGamePlayer = await client.models.GamePlayer.create({
        playerId: games?.player.id ?? '',
        gameId: newGame.data?.id ?? '',
        cashedOut: false,
      });
      navigation.navigate('NewGame', { gameId: newGame.data?.id ?? '' });
    } catch (error) {
      console.error('Error creating new game:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading games...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={games?.player?.games?.map(item =>({
            id: item.game.id,
            name: item.game.name,
            date: item.game.date,
            state: item.game.state,
          })) ?? []}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        style={styles.list}
      />
      <Button
        title="New Game"
        onPress={handleNewGame}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  list: {
    flex: 1,
  },
  gameItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  gameName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  gameDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  playerCount: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
});

export default GamesList;