<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	const { children, data } = $props();
	const session = data.session;
	const brand = 'Captain Jack - Chess Club 7';
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{brand}</title>
</svelte:head>

<div class="app-shell">
	<header class="app-header">
		<a class="brand" href="/">{brand}</a>
		<nav class="nav-links">
			<a href="/">Standings</a>
			{#if session}
				<a href="/admin">Admin</a>
			{:else}
				<a href="/admin/login">Admin</a>
			{/if}
		</nav>
	</header>

	<main class="app-main">
		{@render children()}
	</main>

	<footer class="app-footer">
		<p>&copy; {new Date().getFullYear()} Captain Jack Club. Play boldly.</p>
	</footer>
</div>
