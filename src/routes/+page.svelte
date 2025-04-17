<script lang="ts">
  import { onMount } from 'svelte';
  import Map from '$lib/components/Map.svelte';
  import { 
    pins, 
    tags, 
    viewMode, 
    selectedPinId, 
    filterTags, 
    isAdminMode,
    filteredPins,
    selectedPin,
    isLoadingPins,
    isLoadingTags,
    isLoadingBoundary,
    isLoadingSettings,
    pinsError,
    tagsError,
    boundaryError,
    settingsError,
    loadAllData,
    addPin,
    updatePin,
    deletePin,
    setRegionBoundary
  } from '$lib/stores/mapStore';
  
  // State variables
  let showSidebar = true;
  let mapComponent: any;
  let isDataLoading = true;
  
  // Toggle to admin mode
  function toggleAdminMode() {
    isAdminMode.update(value => !value);
  }
  
  // Toggle tag selection for filtering
  function toggleTagFilter(tag: string) {
    filterTags.update(current => {
      if (current.includes(tag)) {
        return current.filter(t => t !== tag);
      } else {
        return [...current, tag];
      }
    });
  }
  
  // Handle pin selection
  function selectPin(pinId: string) {
    selectedPinId.set(pinId);
    if (mapComponent && $viewMode === 'map') {
      mapComponent.panToPin(pinId);
    }
  }
  
  // Toggle between map and list view
  function toggleViewMode() {
    viewMode.update(current => current === 'map' ? 'list' : 'map');
  }
  
  // Detect if any data is loading
  $: isDataLoading = $isLoadingPins || $isLoadingTags || $isLoadingBoundary || $isLoadingSettings;
  
  // Detect if any errors occurred
  $: dataErrors = [
    $pinsError, 
    $tagsError, 
    $boundaryError, 
    $settingsError
  ].filter(Boolean);
  
  // Initialize data on mount
  onMount(async () => {
    await loadAllData();
  });
</script>

<div class="app-container">
  <!-- Header -->
  <header class="app-header">
    <h1>LGD Map</h1>
    <div class="header-controls">
      {#if isDataLoading}
        <span class="loading-indicator">Loading data...</span>
      {/if}
      <button on:click={toggleAdminMode} class="admin-toggle">
        {$isAdminMode ? 'Exit Admin Mode' : 'Admin Mode'}
      </button>
      <button on:click={toggleViewMode} class="view-toggle">
        {$viewMode === 'map' ? 'Switch to List View' : 'Switch to Map View'}
      </button>
    </div>
  </header>

  {#if dataErrors.length > 0}
    <div class="error-banner">
      <strong>Error loading data:</strong>
      <ul>
        {#each dataErrors as error}
          <li>{error}</li>
        {/each}
      </ul>
      <button type="button" on:click={loadAllData}>Retry</button>
    </div>
  {/if}

  <div class="app-content">
    <!-- Filter Sidebar -->
    <aside class="sidebar filter-sidebar" class:hidden={!showSidebar}>
      <div class="sidebar-header">
        <h2>Filters</h2>
        <button 
          type="button" 
          on:click={() => showSidebar = !showSidebar} 
          class="toggle-button"
          aria-label={showSidebar ? 'Hide filters' : 'Show filters'}
        >
          {showSidebar ? '←' : '→'}
        </button>
      </div>
      
      <div class="filter-section">
        <h3>Tags</h3>
        {#if $isLoadingTags}
          <p>Loading tags...</p>
        {:else}
          <div class="tag-filters" role="group" aria-label="Filter by tags">
            {#each $tags as tag}
              <button 
                type="button"
                class="tag-button" 
                style="--tag-color: {tag.color}"
                class:active={$filterTags.includes(tag.name)}
                on:click={() => toggleTagFilter(tag.name)}
                aria-pressed={$filterTags.includes(tag.name)}
              >
                {tag.name}
              </button>
            {/each}
          </div>
        {/if}
      </div>
      
      {#if $isAdminMode}
        <div class="admin-section">
          <h3>Admin Controls</h3>
          <button class="admin-button" type="button">Add New Pin</button>
          <button class="admin-button" type="button">Manage Tags</button>
          <button class="admin-button" type="button">Edit Region Boundary</button>
          <button class="admin-button" type="button">Configure Pin Fields</button>
        </div>
      {/if}
    </aside>

    <!-- Main Content (Map or List) -->
    <main class="main-content">
      {#if $viewMode === 'map'}
        <Map 
          bind:this={mapComponent}
          pins={$filteredPins} 
          height="calc(100vh - 60px)"
        />
      {:else}
        <div class="list-view">
          <h2>Investment Projects</h2>
          
          {#if $isLoadingPins}
            <div class="loading-container">
              <p>Loading projects...</p>
            </div>
          {:else if $filteredPins.length === 0}
            <div class="empty-state">
              <p>No projects found. {$filterTags.length > 0 ? 'Try changing your filters.' : ''}</p>
            </div>
          {:else}
            <div class="pins-list" role="listbox" aria-label="List of investment projects">
              {#each $filteredPins as pin}
                <div 
                  class="pin-item" 
                  class:active={$selectedPinId === pin.id}
                  on:click={() => selectPin(pin.id)}
                  on:keydown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      selectPin(pin.id);
                    }
                  }}
                  role="option"
                  aria-selected={$selectedPinId === pin.id}
                  tabindex="0"
                >
                  <h3>{pin.title}</h3>
                  <div class="pin-tags">
                    <span 
                      class="main-tag" 
                      style="--tag-color: {$tags.find(t => t.name === pin.mainTag)?.color || '#ccc'}"
                    >
                      {pin.mainTag}
                    </span>
                    {#each pin.supportingTags as tagName}
                      <span 
                        class="supporting-tag"
                        style="--tag-color: {$tags.find(t => t.name === tagName)?.color || '#ccc'}"
                      >
                        {tagName}
                      </span>
                    {/each}
                  </div>
                  <p>{pin.content.find(c => c.type === 'text')?.value || 'No description available.'}</p>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </main>

    <!-- Detail Sidebar (shown when a pin is selected) -->
    {#if $selectedPin}
      <aside class="sidebar detail-sidebar">
        <div class="sidebar-header">
          <h2>{$selectedPin.title}</h2>
          <button 
            type="button" 
            on:click={() => selectedPinId.set(null)} 
            class="close-button"
            aria-label="Close details"
          >
            ×
          </button>
        </div>
        
        <div class="pin-details">
          <div class="pin-tags">
            <span 
              class="main-tag"
              style="--tag-color: {$tags.find(t => t.name === $selectedPin.mainTag)?.color || '#ccc'}"
            >
              {$selectedPin.mainTag}
            </span>
            {#each $selectedPin.supportingTags as tagName}
              <span 
                class="supporting-tag"
                style="--tag-color: {$tags.find(t => t.name === tagName)?.color || '#ccc'}"
              >
                {tagName}
              </span>
            {/each}
          </div>
          
          {#each $selectedPin.content as item}
            <div class="content-item">
              {#if item.title}
                <h3>{item.title}</h3>
              {/if}
              
              {#if item.type === 'text'}
                <p>{item.value}</p>
              {:else if item.type === 'image'}
                <img src={item.value} alt={item.title || $selectedPin.title} />
              {:else if item.type === 'video'}
                <div class="video-container">
                  <iframe 
                    src={item.value} 
                    title={item.title || 'Video'} 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen
                  ></iframe>
                </div>
              {:else if item.type === 'pdf'}
                <div class="pdf-container">
                  <a href={item.value} target="_blank" rel="noopener noreferrer">
                    View PDF Document
                  </a>
                </div>
              {/if}
            </div>
          {/each}
          
          {#if $isAdminMode}
            <div class="admin-controls">
              <button type="button" class="edit-button">Edit Pin</button>
              <button type="button" class="delete-button">Delete Pin</button>
            </div>
          {/if}
        </div>
      </aside>
    {/if}
  </div>
</div>

<style>
  .app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100%;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }
  
  .app-header {
    height: 60px;
    padding: 0 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background-color: #3388ff;
    color: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  .app-header h1 {
    margin: 0;
    font-size: 24px;
  }
  
  .header-controls {
    display: flex;
    gap: 10px;
    align-items: center;
  }
  
  .app-content {
    display: flex;
    flex: 1;
    overflow: hidden;
  }
  
  .sidebar {
    width: 320px;
    background-color: #f8f9fa;
    border-right: 1px solid #ddd;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }
  
  .sidebar.hidden {
    width: 40px;
  }
  
  .detail-sidebar {
    border-left: 1px solid #ddd;
    border-right: none;
  }
  
  .sidebar-header {
    padding: 15px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #ddd;
  }
  
  .sidebar-header h2 {
    margin: 0;
    font-size: 18px;
  }
  
  .main-content {
    flex: 1;
    overflow: hidden;
    position: relative;
  }
  
  .toggle-button, .close-button {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    padding: 5px;
  }
  
  .filter-section, .admin-section {
    padding: 15px;
    border-bottom: 1px solid #ddd;
  }
  
  .filter-section h3, .admin-section h3 {
    margin: 0 0 10px 0;
    font-size: 16px;
  }
  
  .tag-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .tag-button {
    padding: 6px 12px;
    border-radius: 20px;
    border: 1px solid #ddd;
    background-color: white;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
  }
  
  .tag-button.active {
    background-color: var(--tag-color, #3388ff);
    color: white;
    border-color: var(--tag-color, #3388ff);
  }
  
  .admin-button {
    display: block;
    width: 100%;
    padding: 10px;
    margin-bottom: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background-color: white;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s;
  }
  
  .admin-button:hover {
    background-color: #f1f3f5;
  }
  
  .list-view {
    padding: 20px;
    height: 100%;
    overflow-y: auto;
  }
  
  .pins-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
    margin-top: 15px;
  }
  
  .pin-item {
    padding: 15px;
    border-radius: 4px;
    background-color: white;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .pin-item:hover {
    box-shadow: 0 3px 6px rgba(0,0,0,0.15);
  }
  
  .pin-item.active {
    border-left: 4px solid #3388ff;
  }
  
  .pin-item h3 {
    margin: 0 0 8px 0;
    font-size: 18px;
  }
  
  .pin-item p {
    margin: 8px 0 0 0;
    font-size: 14px;
    color: #666;
  }
  
  .pin-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 8px;
  }
  
  .main-tag, .supporting-tag {
    padding: 3px 8px;
    border-radius: 12px;
    font-size: 12px;
  }
  
  .main-tag {
    background-color: var(--tag-color, #3388ff);
    color: white;
  }
  
  .supporting-tag {
    background-color: #e9ecef;
    color: #495057;
    border: 1px solid var(--tag-color, #ddd);
  }
  
  .pin-details {
    padding: 15px;
  }
  
  .content-item {
    margin-bottom: 20px;
  }
  
  .content-item h3 {
    margin: 0 0 8px 0;
    font-size: 16px;
    color: #495057;
  }
  
  .content-item p {
    margin: 0;
    line-height: 1.5;
  }
  
  .content-item img {
    max-width: 100%;
    border-radius: 4px;
    margin-top: 8px;
  }
  
  .video-container {
    position: relative;
    padding-bottom: 56.25%; /* 16:9 aspect ratio */
    height: 0;
    overflow: hidden;
    margin-top: 10px;
  }
  
  .video-container iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 4px;
  }
  
  .pdf-container {
    margin-top: 10px;
  }
  
  .pdf-container a {
    display: inline-block;
    padding: 8px 16px;
    background-color: #f1f3f5;
    color: #495057;
    text-decoration: none;
    border-radius: 4px;
    transition: background-color 0.2s;
  }
  
  .pdf-container a:hover {
    background-color: #e9ecef;
  }
  
  .admin-toggle, .view-toggle {
    padding: 6px 12px;
    background-color: rgba(255, 255, 255, 0.2);
    border: none;
    border-radius: 4px;
    color: white;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .admin-toggle:hover, .view-toggle:hover {
    background-color: rgba(255, 255, 255, 0.3);
  }
  
  .admin-controls {
    display: flex;
    gap: 10px;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #ddd;
  }
  
  .edit-button, .delete-button {
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
  }
  
  .edit-button {
    background-color: #3388ff;
    color: white;
    border: none;
  }
  
  .delete-button {
    background-color: white;
    color: #dc3545;
    border: 1px solid #dc3545;
  }
  
  .edit-button:hover {
    background-color: #2970d6;
  }
  
  .delete-button:hover {
    background-color: #dc3545;
    color: white;
  }
  
  .loading-indicator {
    color: white;
    font-size: 14px;
  }
  
  .loading-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 200px;
    color: #666;
  }
  
  .empty-state {
    text-align: center;
    padding: 40px 0;
    color: #666;
  }
  
  .error-banner {
    background-color: #f8d7da;
    color: #721c24;
    padding: 10px 20px;
    margin-bottom: 10px;
    border-radius: 4px;
  }
  
  .error-banner button {
    background-color: #721c24;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 5px 10px;
    margin-top: 10px;
    cursor: pointer;
  }
</style>