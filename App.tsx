import React from "react";
import GamesList from "./src/GamesList";
import GamePlayersScreen from './src/GamePlayersScreen';
import NewGameScreen from './src/NewGameScreen';
import { RootStackParamList } from './src/types';
import { Button, View, StyleSheet, SafeAreaView } from "react-native";
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { Amplify } from "aws-amplify";
import { Authenticator, useAuthenticator } from "@aws-amplify/ui-react-native";

import outputs from "./amplify_outputs.json";

Amplify.configure(outputs);

const Stack = createNativeStackNavigator<RootStackParamList>();

const SignOutButton = () => {
  const { signOut } = useAuthenticator();

  return (
    <View style={styles.signOutButton}>
      <Button title="Sign Out" onPress={signOut} />
    </View>
  );
};

const AppContent = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen 
          name="GamesList" 
          component={GamesList}
          options={({ navigation }) => ({
            title: 'Games',
            headerRight: () => <SignOutButton />
          })}
        />
        <Stack.Screen 
          name="GamePlayers" 
          component={GamePlayersScreen}
          options={{ title: 'Players' }}
        />
        <Stack.Screen 
          name="NewGame" 
          component={NewGameScreen}
          options={{ title: 'New Game' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const App = () => {
  return (
    <Authenticator.Provider>
      <Authenticator signUpAttributes={['name']}>
        <SafeAreaView style={styles.container}>
          <AppContent />
        </SafeAreaView>
      </Authenticator>
    </Authenticator.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  signOutButton: {
    marginRight: 10,
  },
});

export default App;