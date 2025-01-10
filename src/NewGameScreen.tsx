// NewGameScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Button,
  Modal,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { generateClient } from 'aws-amplify/api';
import { RootStackParamList } from './types';
import { type Schema } from '../amplify/data/resource';
import type { SelectionSet } from 'aws-amplify/data';
import { Float } from 'react-native/Libraries/Types/CodegenTypes';
import {
    calcGameStats,
    calcPlayersStats,
    gameType,
    PlayerType,
    playerSelectionSet, 
    gameSelectionSet
} from './Logic';;
type Props = NativeStackScreenProps<RootStackParamList, 'NewGame'>;
const client = generateClient<Schema>();

const NewGameScreen: React.FC<Props> = ({ route, navigation }) => {
    const { gameId } = route.params;
    const [game, setGame] = useState<gameType>();
    const [newPlayerName, setNewPlayerName] = useState('');
    const [registeredPlayerName, setRegisteredPlayerName] = useState('');
    const [isModalVisible, setModalVisible] = useState(false);
    const [isMoneyActionsModalVisible, setMoneyActionsModalVisible] = useState(false);
    const [cashAmount, setCashAmount] = useState('');
    const [cashOutAmount, setCashOutAmount] = useState('');
    const [selectedGamePlayer, setSelectedGamePlayer] = useState<PlayerType>();
    const [debtAmount, setDebtAmount] = useState('');
    const [debtReport, setDebtReport] = useState<{ giver: string, giverId: string, receiver: string, receiverId: string, amount: number }[]>();
    const [gameDone, setGameDone] = useState(false); 

     useEffect(() => {
        const fetchGame = async () => {
            try {
                const gameResult = await client.models.Game.get({
                    id: gameId,
                }, {selectionSet: gameSelectionSet});

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
    
    const handleAddPlayer = async () => {
        if (newPlayerName.trim()) {
            try {
                const newPlayer = await client.models.Player.create({
                    name: newPlayerName.trim(),
                });
                if (newPlayer.errors || !newPlayer.data) {
                    throw new Error('create player failed');
                }
                const newGamePlayer = await client.models.GamePlayer.create({
                    playerId: newPlayer.data.id,
                    gameId: gameId,
                    cashedOut: false,
                });
                const player = {
                    id: newPlayer.data.id,
                    name: newPlayer.data.name,
                }
                game?.players.push({
                    player: player,
                    id: newGamePlayer.data?.id ?? '',
                    cashedOut: false,
                    moneyTransactions: []
                });
                setNewPlayerName('');
            } catch (error) {
                console.error('Error adding player:', error);
            }
        }
    };

    const handleCashOut = async (gamePlayer: PlayerType, cashAmount: Float, debtAmout: Float) => {
        await handleCashIn(gamePlayer.id, -cashAmount, -debtAmout);
        setGame((prevGame) => {
            if (!prevGame) return prevGame;
            return {
                ...prevGame,
                players: prevGame.players.map((player) =>
                    player.id === gamePlayer.id ? { ...player, cashedOut: true } : player
                ),
            };
        });
        await client.models.GamePlayer.update({
            id: gamePlayer.id,
            cashedOut: true,
        });
    }

    const handleCashIn = async (gamePlayerId: string, cashAmount: Float, debtAmout: Float) => {
        try {
            // Assuming there's a cashIn method in the client to handle the cash in process
            const response = await client.models.MoneyTransaction.create({ 
                gamePlayerId: gamePlayerId,
                cashAmountToPot: cashAmount,
                debtAmountToPot: debtAmout,
             });
             game?.players.filter(player => player.id === gamePlayerId)[0].moneyTransactions.push({
                 id: response.data?.id ?? '',
                 cashAmountToPot: cashAmount,
                 debtAmountToPot: debtAmout,
             });
            if (response.errors || !response.data) {
                throw new Error('Cash in failed');
            }
            Alert.alert('Success', 'Player cashed in successfully');
        } catch (error) {
            Alert.alert('Error', 'Failed to cash in player');
        }
    };

    const handleAddRegiteredPlayer = () => {
        // TODO: Implement logic to add a registered player
        Alert.alert('Not implemented yet');
    };

    const handleRemovePlayer = async (gamePlayerId: string) => {
        const toBeDeletedGamePlayer = {
            id: gamePlayerId
          }
        const { data: deletedTodo, errors } = await client.models.GamePlayer.delete(toBeDeletedGamePlayer)
        if (game) {
            setGame({
                ...game,
                players: game.players.filter(player => player.id !== gamePlayerId),
            });
        }
    };

   

    const renderPlayer = ({ item }: { item: PlayerType }) => {
        const playerStats = calcPlayersStats(item);
        return (<View style={styles.playerItem}>
            <Text style={styles.playerName}>{item.player.name}</Text>
            <Text style={styles.playerName}>
                Invested: {playerStats.invested} {"\n"}
                (Cash: {playerStats.cashIn}, Debt: {playerStats.debtIn})
                {item.cashedOut ? `\nReturned: ${playerStats.returned}` : ''}
                {item.cashedOut ? `\nTotal: ${playerStats.total}` : ''}
                {item.cashedOut ? `\nDebt To Pot: ${playerStats.debtToPot}` : ''}
            </Text>
            <View style={styles.actionButtons}>
                <TouchableOpacity 
                    style={[styles.actionButton, styles.cashInButton]}
                    onPress={() => {
                        setSelectedGamePlayer(item);
                        setMoneyActionsModalVisible(true);
                    }} 
                    >
                    <Text style={styles.actionButtonText}>Money</Text>
                </TouchableOpacity>
                
                {item.moneyTransactions.length === 0 && <TouchableOpacity 
                    style={[styles.actionButton, styles.removeButton]}
                    onPress={() => handleRemovePlayer(item.id)}
                    disabled={item.moneyTransactions.length > 0}
                >
                    <Text style={styles.actionButtonText}>🗑️</Text>
                </TouchableOpacity>}
            </View>
        </View>);
    };

    const handleSaveGameName = async (gameName: string) => {
        setGame((prevGame) => prevGame ? { ...prevGame, name: gameName } : prevGame);
        await client.models.Game.update({
            id: gameId,
            name: gameName,
        });
    }

    const saveDebtReport = async () => {
        if (debtReport) {
            for (const element of debtReport) {
                await client.models.GameDebt.create({gameId: gameId, giverId: element.giverId, receiverId: element.receiverId , amount: element.amount});
            }
        }
    }

    const calcDebts = () => {
        {
            const gameStats = calcGameStats(game ?? {} as gameType);
            const playerStatsMapWithId = new Map(
                game?.players.map(player => [
                    player.id,
                    { name: player.player.name ?? '', debtToPot:calcPlayersStats(player)?.debtToPot ?? 0 },
                ])
            );
            playerStatsMapWithId.set('pot', { name: 'Pot', debtToPot: gameStats.cashIn });

            const calculateDebts = (statsMap: Map<string, { name: string, debtToPot: number }>) => {
                const debts: Array<{ giver: string, giverId: string, receiver: string, receiverId: string, amount: number }> = [];
                
                //TODO - find all debt entries that match with negative values
                const negativeMap = new Map<number, string[]>();

                // Populate the map with negative values and their absolute counterparts
                statsMap.forEach((value, key) => {
                    if (value.debtToPot < 0) {
                        const absNum = Math.abs(value.debtToPot);
                        if (!negativeMap.has(absNum)) {
                            negativeMap.set(absNum, []);
                        }
                        negativeMap.get(absNum)!.push(key);
                    }
                });

                // Find matching positive and negative values
                const matchingNegatives: Map<string, string> = new Map();
                statsMap.forEach((value, key) => {
                    if (value.debtToPot > 0 && negativeMap.has(value.debtToPot) && negativeMap.get(value.debtToPot)!.length > 0) {
                        const recieverId = negativeMap.get(value.debtToPot)!.pop()!;
                        matchingNegatives.set(recieverId, key);
                    }
                });
                
                matchingNegatives.forEach((giver, receiver) => {
                    const giverStats = statsMap.get(giver)!;
                    const receiverStats = statsMap.get(receiver)!;
                    const amount = giverStats.debtToPot;
                    debts.push({ giver: giverStats.name, giverId: giver, receiver: receiverStats.name, receiverId: receiver, amount: amount });
                    statsMap.delete(giver);
                    statsMap.delete(receiver);
                });

                // Implement logic to calculate debts based on player stats
                // For simplicity, let's assume each player with positive total owes to each player with negative total
                const positivePlayers = Array.from(statsMap.entries())
                    .filter(([_, stats]) => stats.debtToPot > 0)
                    .sort((a, b) => b[1].debtToPot - a[1].debtToPot);
                const negativePlayers = Array.from(statsMap.entries())
                    .filter(([_, stats]) => stats.debtToPot < 0)
                    .sort((a, b) => a[1].debtToPot - b[1].debtToPot);

                while (positivePlayers.length > 0 && negativePlayers.length > 0) {
                    const [giver, giverStats] = positivePlayers[0];
                    const [receiver, receiverStats] = negativePlayers[0];
                    const amount = Math.min(giverStats.debtToPot, -receiverStats.debtToPot);
                    debts.push({ giver: giverStats.name, giverId: giver, receiver: receiverStats.name, receiverId: receiver, amount });
                    giverStats.debtToPot -= amount;
                    receiverStats.debtToPot += amount;
                    if (giverStats.debtToPot === 0) {
                        positivePlayers.shift();
                    }
                    if (receiverStats.debtToPot === 0) {
                        negativePlayers.shift();
                    }
                }
                
                return debts;
            };

        const res = calculateDebts(playerStatsMapWithId);
        setDebtReport(res);
    }}

    return (
        <View style={styles.container}>
        <TextInput
            style={styles.title}
            value={game?.name ?? ''}
            onChangeText={(text) => setGame((prevGame) => prevGame ? { ...prevGame, name: text } : prevGame)}
            onEndEditing={(event) => handleSaveGameName(event.nativeEvent.text)}
            editable={game?.state !== 'Closed'}
        />
        {game && (() => {
                const gameStats = calcGameStats(game);
                return (
                <Text style={styles.playerName}>
                    Invested: {gameStats.invested} (Cash: {gameStats.cashIn}, Debt: {gameStats.debtIn}) {"\n"}
                    Returned: {gameStats.returned}
                </Text>
                );
            })()}
            <View style={styles.addPlayerContainer}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                    <TextInput
                        style={styles.input}
                        value={newPlayerName}
                        onChangeText={setNewPlayerName}
                        placeholder="Enter player name"
                    />
                    <TouchableOpacity style={[styles.addPlayerButton]} disabled={game?.state === 'Closed'} onPress={handleAddPlayer} >
                        <Text style={styles.addPlayerButtonText}>Add New Player</Text>
                    </TouchableOpacity>
                </View>
            </View>
            {/* <View style={styles.addPlayerContainer}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                    <TextInput
                        style={styles.input}
                        value={registeredPlayerName}
                        onChangeText={setRegisteredPlayerName}
                        placeholder="Enter player's email"
                        editable={false}
                    />
                    <Button title="Add Registered Player" disabled={true} onPress={handleAddRegiteredPlayer} />
                </View>
            </View> */}

            <FlatList
                data={game?.players ?? []}
                renderItem={renderPlayer}
                keyExtractor={(item) => item.id}
                style={styles.playersList}
            />

<View style={styles.addPlayerContainer}>
            <Button
                title="Finish Game"
                onPress={async () => {
                    try {
                        await client.models.Game.update({
                            id: gameId,
                            state: 'Closed',
                        });
                        setGame((prevGame) => {
                            if (!prevGame) return prevGame;
                            return {
                                ...prevGame,
                                state: 'Closed',
                            };
                        });
                        await saveDebtReport();

                        Alert.alert('Success', 'Game has been closed');
                        navigation.navigate('GamePlayers', { gameId: game?.id ?? '' });
                    } catch (error) {
                        Alert.alert('Error', 'Failed to close the game');
                    }
                }}
                disabled={!gameDone}
            />

           <Button
                title="Fix Debts"
                onPress={() => {
                    calcDebts();
                    setModalVisible(true);}}
                disabled={(() => {
                    if (!game) return true;
                    const gameStats = calcGameStats(game ?? {} as gameType);
                    return game?.players.some(player => !player.cashedOut) || gameStats.invested != gameStats.returned;
                })()}
            />
</View>
            <Modal
                animationType="slide"
                transparent={false}
                visible={isMoneyActionsModalVisible}
                style={styles.actionButtons}
                onRequestClose={() => {
                    setMoneyActionsModalVisible(!isMoneyActionsModalVisible);
                }}
            >
                <View style={styles.modalView}>
                <Text style={styles.modalTitle}>Money Actions</Text>
                
                    {!selectedGamePlayer?.cashedOut && <View style={styles.addPlayerContainer}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter cash amount"
                                keyboardType="numeric"
                                onChangeText={(text) => setCashAmount(text)}
                            />
                            <TouchableOpacity style={[styles.addPlayerButton]} disabled={game?.state === 'Closed'} onPress={async () => {
                                const amount = parseFloat(cashAmount || '0');
                                await handleCashIn(selectedGamePlayer?.id ?? '', amount, 0.0);
                                setMoneyActionsModalVisible(false);
                            }} >
                                <Text style={styles.addPlayerButtonText}>Cash In Money</Text>
                            </TouchableOpacity>
                        </View>
                    </View>}
                    {!selectedGamePlayer?.cashedOut && <View style={styles.addPlayerContainer}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter debt amount"
                                keyboardType="numeric"
                                onChangeText={(text) => setDebtAmount(text)}
                            />
                            <TouchableOpacity style={[styles.addPlayerButton]} disabled={game?.state === 'Closed'} onPress={async () => {
                                const amount = parseFloat(debtAmount || '0');
                                await handleCashIn(selectedGamePlayer?.id ?? '', 0.0, amount);
                                setMoneyActionsModalVisible(false);
                            }} >
                                <Text style={styles.addPlayerButtonText}>Cash In Debt</Text>
                            </TouchableOpacity>
                        </View>
                    </View>}
                   
                    {!selectedGamePlayer?.cashedOut && <View style={styles.addPlayerContainer}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter cash amount"
                                keyboardType="numeric"
                                onChangeText={(text) => setCashOutAmount(text)}
                            />
                            <TouchableOpacity style={[styles.addPlayerButton]} disabled={game?.state === 'Closed'} onPress={async () => {
                                const amount = parseFloat(cashOutAmount || '0');
                                await handleCashOut(selectedGamePlayer ?? {} as PlayerType, 0.0, amount);
                                setMoneyActionsModalVisible(false);
                            }} >
                                <Text style={styles.addPlayerButtonText}>Cash Out</Text>
                            </TouchableOpacity>
                        </View>
                    </View>}
                    
                    {selectedGamePlayer?.cashedOut && <View style={styles.addPlayerContainer}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter debt amount"
                                keyboardType="numeric"
                                onChangeText={(text) => setDebtAmount(text)}
                            />
                            <TouchableOpacity style={[styles.addPlayerButton]} disabled={game?.state === 'Closed'} onPress={() => {
                                const amount = parseFloat(debtAmount || '0');
                                const stats = calcPlayersStats(selectedGamePlayer);
                                if (amount > stats.debtToPot)
                                {
                                    Alert.alert('Error', 'cant convert more than the debt to pot');
                                    return;
                                }
                                handleCashIn(selectedGamePlayer?.id ?? '', amount, -amount);
                                setMoneyActionsModalVisible(false);
                            }} >
                                <Text style={styles.addPlayerButtonText}>Convert Debt</Text>
                            </TouchableOpacity>
                        </View>
                    </View>}
                    
                    <TouchableOpacity style={[styles.cancelButton]} onPress={() => setMoneyActionsModalVisible(false)} >
                        <Text style={styles.addPlayerButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </Modal>

            <Modal
                animationType="slide"
                transparent={true}
                visible={isModalVisible}
                onRequestClose={() => {
                    setModalVisible(!isModalVisible);
                }}
            >
                {isModalVisible && <View style={styles.modalView}>
                    <Text style={styles.modalTitle}>Debts</Text>
                    
                    <FlatList
                        data={debtReport}
                        renderItem={({ item }) => (
                            <View style={styles.modalPlayerItem}>
                                <Text style={styles.modalPlayerName}>
                                    {item.giver} owes {item.amount} to {item.receiver}
                                </Text>
                            </View>
                        )}
                        keyExtractor={(item, index) => index.toString()}
                    />
                    <Button title="Accept" onPress={async () => {
                        setModalVisible(false);
                        setGameDone(true);
                        }} />
                </View>}
            </Modal>

            
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: 'white',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    addPlayerContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        alignItems: 'center',
        justifyContent:'space-between',
        gap: 100
    },
    addPlayerButton: {
        backgroundColor: '#2196F3',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
        height: 60,
        width: 150,
        justifyContent: 'center',
        marginLeft: 8,
    },
    cancelButton: {
        backgroundColor: 'red',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
        height: 40,
        width: 150,
        justifyContent: 'center',
        marginLeft: 8,
    },
    addPlayerButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    input: {
        flex: 1,
        marginRight: 8,
        padding: 8,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 4,
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
        //flex: 1,
    },
    actionButtons: {
        flexDirection: 'column',
        gap: 8,
    },
    actionButton: {
        paddingHorizontal: 12,
        paddingVertical: 2,
        borderRadius: 4,
        minWidth: 80,
        minHeight: 40,
        alignItems: 'center',
    },
    actionButtonText: {
        color: 'white',
        fontSize: 12,
    },
    cashInButton: {
        backgroundColor: '#4CAF50',
    },
    removeButton: {
        backgroundColor: '#757575',
        minWidth: 40,
        minHeight: 20,
    },
    modalView: {
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 35,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTextButton: {
        flexDirection: 'row',
        marginBottom: 16,
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

export default NewGameScreen;
