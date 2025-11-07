<script lang="ts">
	import type { PageData } from './$types';
	import { TIME_CONTROL_TYPES, type TimeControlType } from '$lib/types';

	const { data } = $props<{ data: PageData }>();
	const players = data.players;
	const timeControls = data.timeControls;
	const DISPLAY_TIME_CONTROLS = [...TIME_CONTROL_TYPES].reverse();

	type SortKey = 'name' | 'rating' | 'wins' | 'losses' | 'draws';
	type SortDirection = 'asc' | 'desc';

	const sortState =
		$state<Record<TimeControlType, { key: SortKey; direction: SortDirection }>>(
			Object.fromEntries(
				TIME_CONTROL_TYPES.map((type) => [type, { key: 'rating', direction: 'desc' }])
			) as Record<TimeControlType, { key: SortKey; direction: SortDirection }>
		);

	type PlayerRow = PageData['players'][number];

	const toRows = (type: TimeControlType) =>
		players.map((player: PlayerRow) => {
			const stats = player.stats[type];
			return {
				id: player.id,
				name: `${player.firstName} ${player.lastName}`,
				rating: stats.rating,
				wins: stats.wins,
				losses: stats.losses,
				draws: stats.draws
			};
		});

	const sortRows = (type: TimeControlType) => {
		const rows = [...toRows(type)];
		const { key, direction } = sortState[type];

		rows.sort((a, b) => {
			const valueA = a[key];
			const valueB = b[key];
			const comparison =
				typeof valueA === 'string' && typeof valueB === 'string'
					? valueA.localeCompare(valueB)
					: (valueA as number) - (valueB as number);
			return direction === 'asc' ? comparison : -comparison;
		});

		return rows;
	};

	const toggleSort = (type: TimeControlType, key: SortKey) => {
		const current = sortState[type];
		sortState[type] = {
			key,
			direction:
				current.key === key ? (current.direction === 'asc' ? 'desc' : 'asc') : key === 'name' ? 'asc' : 'desc'
		};
	};

	const rangeLabel = (type: TimeControlType) => {
		const range = timeControls[type];
		if (!range) return '';
		if (range.upper !== undefined && range.upper !== null && range.upper > range.lower) {
			return `${range.lower} <= minutes < ${range.upper}`;
		}
		return `${range.lower} minutes or more`;
	};
</script>

<section class="hero">
	<div>
		<p class="eyebrow">Club Standings</p>
		<h1>Captain Jack - Chess Club 7</h1>
		<p class="tagline">
			Track Elo across every time control, compare head-to-head records, and celebrate the fiercest
			games in town.
		</p>
	</div>
</section>

{#each DISPLAY_TIME_CONTROLS as type (type)}
	<section class="standings-section">
		<div class="section-header">
			<div>
				<p class="eyebrow">Format</p>
				<h2>{type}</h2>
			</div>
			<p class="range">{rangeLabel(type)}</p>
		</div>

		<div class="table-wrapper">
			<table aria-label={`${type} standings table`}>
				<thead>
					<tr>
						<th>
							<button type="button" class="sort-btn" onclick={() => toggleSort(type, 'name')}>
								Player
								{#if sortState[type].key === 'name'}
									<span class="sort-indicator">
										{sortState[type].direction === 'asc' ? '▲' : '▼'}
									</span>
								{/if}
							</button>
						</th>
						<th>
							<button type="button" class="sort-btn" onclick={() => toggleSort(type, 'rating')}>
								Rating
								{#if sortState[type].key === 'rating'}
									<span class="sort-indicator">
										{sortState[type].direction === 'asc' ? '▲' : '▼'}
									</span>
								{/if}
							</button>
						</th>
						<th>
							<button type="button" class="sort-btn" onclick={() => toggleSort(type, 'wins')}>
								Wins
								{#if sortState[type].key === 'wins'}
									<span class="sort-indicator">
										{sortState[type].direction === 'asc' ? '▲' : '▼'}
									</span>
								{/if}
							</button>
						</th>
						<th>
							<button type="button" class="sort-btn" onclick={() => toggleSort(type, 'losses')}>
								Losses
								{#if sortState[type].key === 'losses'}
									<span class="sort-indicator">
										{sortState[type].direction === 'asc' ? '▲' : '▼'}
									</span>
								{/if}
							</button>
						</th>
						<th>
							<button type="button" class="sort-btn" onclick={() => toggleSort(type, 'draws')}>
								Draws
								{#if sortState[type].key === 'draws'}
									<span class="sort-indicator">
										{sortState[type].direction === 'asc' ? '▲' : '▼'}
									</span>
								{/if}
							</button>
						</th>
					</tr>
				</thead>
				<tbody>
					{#if sortRows(type).length === 0}
						<tr>
							<td colspan="5">No players yet.</td>
						</tr>
					{:else}
						{#each sortRows(type) as row (row.id)}
							<tr>
								<td>
									<a href={`/player/${row.id}`}>{row.name}</a>
								</td>
								<td>{row.rating}</td>
								<td>{row.wins}</td>
								<td>{row.losses}</td>
								<td>{row.draws}</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</section>
{/each}
