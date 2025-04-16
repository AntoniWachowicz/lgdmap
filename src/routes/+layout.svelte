<!-- src/routes/+layout.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';
    import '../app.css';
    
    // Initialize global styles
    onMount(() => {
      // Any global initialization can go here
    });
  </script>
  
  <slot></slot>