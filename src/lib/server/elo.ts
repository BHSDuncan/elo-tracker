import type { PlayerStats } from '$lib/types';

const getKFactor = (gamesPlayed: number) => {
	if (gamesPlayed < 10) return 40;
	if (gamesPlayed < 30) return 20;
	return 10;
};

const expectedScore = (ratingA: number, ratingB: number) => 1 / (1 + 10 ** ((ratingB - ratingA) / 400));

export const applyElo = (player: PlayerStats, opponent: PlayerStats, score: number) => {
	const expected = expectedScore(player.rating, opponent.rating);
	const k = getKFactor(player.wins + player.losses + player.draws);
	const newRating = Math.round(player.rating + k * (score - expected));
	return { ...player, rating: newRating };
};

export const recordOutcome = (stats: PlayerStats, score: number) => {
	const updated = { ...stats };
	if (score === 1) updated.wins += 1;
	else if (score === 0) updated.losses += 1;
	else updated.draws += 1;
	return updated;
};
