<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import type { Pin } from '$lib/stores/mapStore';
    
    // Import Leaflet conditionally to avoid SSR issues
    let L: any;
    
    // Map properties
    export let height = '100%';
    export let mapCenter = [52.0977, 19.0258]; // Default center of Poland
    export let zoom = 6;
    export let minZoom = 5;
    export let maxZoom = 18;
    export let pins: Pin[] = [];
    
    let mapElement: HTMLElement;
    let map: any;
    let markers: any[] = [];
    let regionBoundary: any = null;
    
    // Define icon for pins
    const createIcon = (tagColor: string = '#3388ff') => {
      return L.divIcon({
        className: 'custom-pin',
        html: `<div style="background-color: ${tagColor}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white;"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
    };
  
    // Initialize map on component mount
    onMount(async () => {
      // Check if we're in the browser environment
      if (typeof window !== 'undefined') {
        // Import Leaflet on the client-side only
        L = await import('leaflet');
        
        // Import Leaflet CSS
        await import('leaflet/dist/leaflet.css');
        
        // Initialize the map
        map = L.map(mapElement, {
          center: mapCenter,
          zoom: zoom,
          minZoom: minZoom,
          maxZoom: maxZoom
        });
        
        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        
        // Add pins to the map
        addPinsToMap();
      }
    });
    
    // Clean up on component destroy
    onDestroy(() => {
      if (map) {
        map.remove();
      }
    });
    
    // Function to add pins to the map
    function addPinsToMap() {
      if (!map || !L) return;
      
      // Clear existing markers
      markers.forEach(marker => marker.remove());
      markers = [];
      
      pins.forEach(pin => {
        // Create marker
        const marker = L.marker(pin.position, {
          icon: createIcon(getTagColor(pin.mainTag)),
          title: pin.title
        }).addTo(map);
        
        // Add popup with basic info
        marker.bindPopup(`
          <div class="pin-popup">
            <h3>${pin.title}</h3>
            <p>Main Tag: ${pin.mainTag}</p>
            ${pin.supportingTags.length > 0 ? 
              `<p>Supporting Tags: ${pin.supportingTags.join(', ')}</p>` : ''}
          </div>
        `);
        
        // Store marker in array for future reference
        markers.push(marker);
      });
    }
    
    // Update pins when the prop changes
    $: if (map && L && pins) {
      addPinsToMap();
    }
    
    // Helper function to get color for tag (can be replaced with actual mapping)
    function getTagColor(tag: string): string {
      // Simple hash function to generate colors
      let hash = 0;
      for (let i = 0; i < tag.length; i++) {
        hash = tag.charCodeAt(i) + ((hash << 5) - hash);
      }
      
      const c = (hash & 0x00FFFFFF)
        .toString(16)
        .toUpperCase()
        .padStart(6, '0');
        
      return `#${c}`;
    }
    
    // Function to set region boundary (for admin users)
    export function setRegionBoundary(coordinates: [number, number][]) {
      if (!map || !L) return;
      
      if (regionBoundary) {
        regionBoundary.remove();
      }
      
      regionBoundary = L.polygon(coordinates, {
        color: '#ff7800',
        weight: 2,
        fillOpacity: 0.1
      }).addTo(map);
      
      // Fit map to boundary
      map.fitBounds(regionBoundary.getBounds());
    }
    
    // Function to pan to a specific pin
    export function panToPin(pinId: string) {
      const pin = pins.find(p => p.id === pinId);
      if (pin && map) {
        map.setView(pin.position, Math.max(zoom, 12));
      }
    }
  </script>
  
  <div class="map-container" style="height: {height};">
    <div bind:this={mapElement} class="map"></div>
  </div>
  
  <style>
    .map-container {
      width: 100%;
      position: relative;
    }
    
    .map {
      height: 100%;
      width: 100%;
      z-index: 1;
    }
    
    :global(.custom-pin) {
      display: flex;
      justify-content: center;
      align-items: center;
    }
    
    :global(.pin-popup h3) {
      margin: 0 0 8px 0;
      font-size: 16px;
    }
    
    :global(.pin-popup p) {
      margin: 0 0 5px 0;
      font-size: 14px;
    }
  </style>