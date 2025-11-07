<script lang="ts">
	import type { PageData } from './$types';
	import { TIME_CONTROL_TYPES } from '$lib/types';
	import { format } from 'date-fns';

	const props = $props<{ data: PageData }>();
	const data = $derived(props.data);
	const player = $derived(data.player);
	const games = $derived(data.games);
	const timeControls = $derived(data.timeControls);

	const formatDate = (date: string) => format(new Date(date), 'MMM d, yyyy');
	const describeTimeControl = (game: PageData['games'][number]) => {
		const hasClock = game.startMinutes != null || game.incrementSeconds != null;
		if (!hasClock) return `${game.timeControlType} (no clock)`;
		const start = game.startMinutes ?? 0;
		const increment = game.incrementSeconds ?? 0;
		if (!increment) {
			return `${game.timeControlType} (${start}m)`;
		}
		return `${game.timeControlType} (${start}+${increment}s)`;
	};
</script>

<section class="player-hero">
	<div>
		<p class="eyebrow">Player card</p>
		<h1>{player.firstName} {player.lastName}</h1>
		<p class="tagline">Live form across every time control.</p>
	</div>
	<a class="back-link" href="/">← Back to standings</a>
</section>

<section class="stats-grid">
	{#each TIME_CONTROL_TYPES as type (type)}
		<div class="stat-card">
			<p class="eyebrow">{type}</p>
			<h3>{player.stats[type].rating}</h3>
			<p class="record">
				{player.stats[type].wins}-{player.stats[type].losses}-{player.stats[type].draws}
				<span>W-L-D</span>
			</p>
			<p class="range">
				{#if timeControls[type]?.upper !== undefined && timeControls[type]?.upper !== null && timeControls[type]!.upper > timeControls[type]!.lower}
					{timeControls[type]!.lower} &lt;= minutes &lt; {timeControls[type]!.upper}
				{:else if timeControls[type]}
					{timeControls[type]!.lower}+ minutes
				{:else}
					Range unavailable
				{/if}
			</p>
		</div>
	{/each}
</section>

<section class="standings-section">
	<div class="section-header">
		<div>
			<p class="eyebrow">Game history</p>
			<h2>Recent games</h2>
		</div>
	</div>

	<div class="table-wrapper">
		<table aria-label="Player game log">
			<thead>
				<tr>
					<th>Date</th>
					<th>Color</th>
					<th>Opponent</th>
					<th>Result</th>
					<th>Time control</th>
					<th>Cause</th>
				</tr>
			</thead>
			<tbody>
				{#if games.length === 0}
					<tr>
						<td colspan="6">No games recorded yet.</td>
					</tr>
				{:else}
					{#each games as game (game.id)}
						<tr>
							<td>{formatDate(game.date)}</td>
							<td>{game.color}</td>
							<td>
								<a href={`/player/${game.opponentId}`}>{game.opponentName}</a>
							</td>
							<td>{game.result}</td>
							<td>{describeTimeControl(game)}</td>
							<td>{game.cause}</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</section>
