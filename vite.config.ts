import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	// Expose env variables to client
	define: {
		'process.env.POSTGRES_PRISMA_URL': JSON.stringify(process.env.POSTGRES_PRISMA_URL),
		'process.env.POSTGRES_URL': JSON.stringify(process.env.POSTGRES_URL),
	}
});