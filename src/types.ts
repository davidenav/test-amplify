// types.ts
export interface Player {
    id: string;
    name: string;
  }
  
  export interface GamePlayer {
    player: Player;
  }
  
  export type RootStackParamList = {
    GamesList: undefined;
    GamePlayers: {gameId: string };
    NewGame: {gameId: string};
  };
  