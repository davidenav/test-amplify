import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { postConfirmation } from "../auth/post-confirmation/resource";

const schema = a.schema({
  UserProfile: a
    .model({
      email: a.email().required(),
      name: a.string(),
      profileOwner: a.string(),
      player: a.hasOne('Player', 'userProfileId'),
    })
    .identifier(['email']),

  GamePlayer: a.model({
    game: a.belongsTo('Game', 'gameId'),
    gameId: a.id().required(),
    player: a.belongsTo('Player', 'playerId'),
    playerId: a.id().required(),
    cashedOut: a.boolean().required(),
    moneyTransactions: a.hasMany('MoneyTransaction', 'gamePlayerId'),
    debtTo: a.hasOne('GameDebt', 'giverId'),
    debtFrom: a.hasOne('GameDebt', 'receiverId'),
  }),

  Player: a
    .model({
      name: a.string(),
      userProfile: a.belongsTo('UserProfile', 'userProfileId'),
      userProfileId: a.email(),
      games: a.hasMany('GamePlayer', 'playerId'),
      gamesOrganized: a.hasMany('Game', 'ownerId'),
    }),

  Game: a
    .model({
      name: a.string(),
      date: a.date(),
      startTime: a.datetime(),
      endTime: a.datetime(),
      // minimumBuyIn: a.float(),
      // smallBigChips: a.float(),
      moneyChipRatio: a.float(),
      players: a.hasMany('GamePlayer', 'gameId'),
      gameDebts: a.hasMany('GameDebt', 'gameId'),
      state: a.enum(['Open', 'Closed']),
      ownerId: a.id().required(),
      owner: a.belongsTo('Player', 'ownerId'),
    }),

  MoneyTransaction: a
    .model({
      cashAmountToPot: a.float(),
      debtAmountToPot: a.float(),
      gamePlayer: a.belongsTo('GamePlayer', 'gamePlayerId'),
      gamePlayerId: a.id().required(),
    }),

  GameDebt: a
    .model({
      game: a.belongsTo('Game', 'gameId'),
      gameId: a.id().required(),
      giverId: a.id().required(),
      giver: a.belongsTo('GamePlayer', 'giverId'),
      receiverId: a.id().required(),
      receiver: a.belongsTo('GamePlayer', 'receiverId'),
      amount: a.float().required(),
    })
}).authorization((allow) => [allow.authenticated(), allow.resource(postConfirmation)]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
