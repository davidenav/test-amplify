import { type Schema } from '../amplify/data/resource';
import type { SelectionSet } from 'aws-amplify/data';

export const playerSelectionSet = ['id', 'cashedOut','player.name', 'player.id', 'moneyTransactions.id', 'moneyTransactions.cashAmountToPot', 
    'moneyTransactions.debtAmountToPot'] as const;
export type PlayerType = SelectionSet<Schema['GamePlayer']['type'], typeof playerSelectionSet>;
export const gameSelectionSet = ['name', 'id', 'state','players.id', 'players.cashedOut','players.player.id', 'players.player.name', 'players.moneyTransactions.id', 
    'players.moneyTransactions.cashAmountToPot', 'players.moneyTransactions.debtAmountToPot'] as const;
export type gameType = SelectionSet<Schema['Game']['type'], typeof gameSelectionSet>;

export const gameSelectionSeWithDebts = [...gameSelectionSet, 'gameDebts.giver.player.name', 'gameDebts.receiver.player.name', 'gameDebts.amount']  as const;
export type gameWithDebtType = SelectionSet<Schema['Game']['type'], typeof gameSelectionSeWithDebts>;

function calcGameStats(game: gameType) : {cashIn: number, debtIn: number, invested: number, cachedOut: number, returned: number, total: number, debtToPot: number} {
    let cashIn = 0;
    let debtIn = 0;
    let invested = 0;
    let cachedOut = 0;
    let returned = 0;
    let total = 0;
    let debtToPot = 0;
    game?.players.forEach((player) => {
        const playerStats = calcPlayersStats(player);
        cashIn += playerStats.cashIn;
        debtIn += playerStats.debtIn;
        invested += playerStats.invested;
        cachedOut += playerStats.cachedOut ? 1 : 0;
        returned += playerStats.returned;
        total += playerStats.total;
        debtToPot += playerStats.debtToPot;
    });
    return {cashIn, debtIn, invested, cachedOut: cachedOut, returned, total, debtToPot};
}

function calcPlayersStats(player: PlayerType) : {cashIn: number, debtIn: number, invested: number, cachedOut: boolean, returned: number, total: number, debtToPot: number} {
    let cashIn = 0;
    let debtIn = 0;
    let debtOut = 0;
    player.moneyTransactions.forEach(transaction => {
        cashIn += transaction.cashAmountToPot ?? 0;
        if (transaction.debtAmountToPot) {
            if (transaction.debtAmountToPot < 0 && transaction.cashAmountToPot === 0)
            {
                debtOut += -transaction.debtAmountToPot;
            }
            else
            {
                debtIn += transaction.debtAmountToPot;
            }
        }
    });
    let invested = cashIn + debtIn;
    let total = debtOut - invested;
    let debtToPot = debtIn - debtOut;
    return {cashIn, debtIn, invested, cachedOut: player.cashedOut, returned: debtOut, total, debtToPot};
}

export { calcGameStats, calcPlayersStats };