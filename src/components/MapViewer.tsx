import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Loader2, MapPin } from 'lucide-react';

interface MapViewerProps {
  geoJsonData?: GeoJSON.FeatureCollection | null;
}

export function MapViewer({ geoJsonData }: MapViewerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'carto-tiles': {
            type: 'raster',
            // CARTO Dark Matter tiles (dark_all)
            tiles: [
              'https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
              'https://b.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
              'https://c.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
              'https://d.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors © CARTO',
          },
        },
        layers: [
          {
            id: 'carto-tiles',
            type: 'raster',
            source: 'carto-tiles',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      },
      center: [-8.6730, 37.1028], // Lagos, Portugal
      zoom: 10,
      pitch: 0,
    });

    map.current.addControl(
      new maplibregl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    map.current.addControl(new maplibregl.ScaleControl(), 'bottom-left');

    map.current.on('load', () => {
      setIsLoading(false);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current || !geoJsonData) return;

    let popup: maplibregl.Popup | null = null;
    let handleClick: ((e: any) => void) | null = null;
    let handleMouseMove: ((e: any) => void) | null = null;

    const addGeoLayers = () => {
      if (!map.current) return;

      // Remove existing layers and sources if present
      if (map.current.getLayer('geojson-layer')) {
        try { map.current.removeLayer('geojson-layer'); } catch (e) {}
      }
      if (map.current.getLayer('geojson-layer-highlight')) {
        try { map.current.removeLayer('geojson-layer-highlight'); } catch (e) {}
      }
      if (map.current.getLayer('geojson-points')) {
        try { map.current.removeLayer('geojson-points'); } catch (e) {}
      }
      if (map.current.getSource('geojson-data')) {
        try { map.current.removeSource('geojson-data'); } catch (e) {}
      }

      // Add new source
      map.current.addSource('geojson-data', {
        type: 'geojson',
        data: geoJsonData,
      });

      // Add line layer for LineString / MultiLineString / Polygon geometries
      // Note: don't include 'MultiLineString' in a $type filter (MapLibre expects Point/LineString/Polygon only).
      // Without a filter the line layer will render LineString and MultiLineString geometries.
      map.current.addLayer({
        id: 'geojson-layer',
        type: 'line',
        source: 'geojson-data',
        paint: {
          'line-color': 'hsl(173, 80%, 40%)',
          'line-width': 3,
          'line-opacity': 0.8,
        },
      });

      // Add a separate layer for highlighted trail on hover/click. Start with a non-matching filter so nothing is shown.
      map.current.addLayer({
        id: 'geojson-layer-highlight',
        type: 'line',
        source: 'geojson-data',
        paint: {
          'line-color': 'hsl(48, 95%, 50%)',
          'line-width': 5,
          'line-opacity': 0.9,
        },
        filter: ['==', ['get', 'id'], '___no_match___'],
      });

      // Add point layer for Point features
      map.current.addLayer({
        id: 'geojson-points',
        type: 'circle',
        source: 'geojson-data',
        paint: {
          'circle-radius': 8,
          'circle-color': 'hsl(173, 80%, 40%)',
          'circle-stroke-color': 'hsl(222, 47%, 6%)',
          'circle-stroke-width': 2,
        },
        filter: ['==', '$type', 'Point'],
      });

      // Fit bounds to data
      const bounds = new maplibregl.LngLatBounds();
      geoJsonData.features.forEach((feature) => {
        const t = feature.geometry.type;
        if (t === 'Point') {
          bounds.extend(feature.geometry.coordinates as [number, number]);
        } else if (t === 'LineString') {
          feature.geometry.coordinates.forEach((coord) => bounds.extend(coord as [number, number]));
        } else if (t === 'MultiLineString') {
          // MultiLineString: array of LineString coordinate arrays
          (feature.geometry.coordinates as any[]).forEach((line) => line.forEach((coord: any) => bounds.extend(coord as [number, number])));
        } else if (t === 'Polygon') {
          (feature.geometry.coordinates[0] || []).forEach((coord: any) => bounds.extend(coord as [number, number]));
        }
      });

      // Prefer zooming to the first LineString / MultiLineString feature so the user sees a trail
      const firstLineFeature = geoJsonData.features.find((f) => f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString');
      if (firstLineFeature) {
        const lineBounds = new maplibregl.LngLatBounds();
        if (firstLineFeature.geometry.type === 'LineString') {
          (firstLineFeature.geometry.coordinates as any[]).forEach((coord) => lineBounds.extend(coord as [number, number]));
        } else if (firstLineFeature.geometry.type === 'MultiLineString') {
          (firstLineFeature.geometry.coordinates as any[]).forEach((line) => line.forEach((coord: any) => lineBounds.extend(coord as [number, number])));
        }

        if (!lineBounds.isEmpty()) {
          // use a maxZoom to avoid zooming excessively into very short segments
          map.current.fitBounds(lineBounds, { padding: 80, maxZoom: 15 });
        } else if (!bounds.isEmpty()) {
          map.current.fitBounds(bounds, { padding: 50 });
        }
      } else {
        if (!bounds.isEmpty()) {
          map.current.fitBounds(bounds, { padding: 50 });
        }
      }

      // Popup handling: show when clicking a LineString feature
      popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true });

      handleClick = (e: any) => {
        const features = map.current!.queryRenderedFeatures(e.point, { layers: ['geojson-layer'] });
        if (!features || features.length === 0) return;
        const feat = features[0];
        const props = feat.properties || {};
        const coord = e.lngLat;
        const html = `
          <div style="min-width:200px">
            <div style="font-size:14px;color:#666">Name: ${props.name ?? 'Trail'}</div>
            <div style="font-size:12px;color:#666">Distance: ${props.distance ?? '-'} m</div>
            <div style="font-size:12px;color:#666">Duration: ${props.duration ?? '-'} s</div>
            <div style="font-size:12px;color:#666">Pace: ${props.pace ?? '-'}</div>
            <div style="margin-top:6px;font-size:12px;color:#666">${props.description ?? ''}</div>
          </div>
        `;
        popup!.setLngLat([coord.lng, coord.lat]).setHTML(html).addTo(map.current!);
      };

      handleMouseMove = (e: any) => {
        const features = map.current!.queryRenderedFeatures(e.point, { layers: ['geojson-layer'] });
        if (features && features.length > 0) {
          map.current!.getCanvas().style.cursor = 'pointer';
          const id = features[0].properties?.id;
          if (id) {
            map.current!.setFilter('geojson-layer-highlight', ['==', ['get', 'id'], id]);
          }
        } else {
          map.current!.getCanvas().style.cursor = '';
          map.current!.setFilter('geojson-layer-highlight', ['==', ['get', 'id'], '___no_match___']);
        }
      };

      map.current.on('click', handleClick);
      map.current.on('mousemove', handleMouseMove);
    };

    // If style isn't yet loaded, wait for it then add layers. Otherwise add immediately.
    if (!map.current.isStyleLoaded()) {
      map.current.once('load', addGeoLayers);
    } else {
      addGeoLayers();
    }

    // Clean up listeners and layers when geoJsonData or map changes
    return () => {
      if (!map.current) return;
      try {
        if (handleClick) map.current.off('click', handleClick);
        if (handleMouseMove) map.current.off('mousemove', handleMouseMove);
      } catch (e) {}
      try { popup?.remove(); } catch (e) {}
      try { if (map.current.getLayer('geojson-layer')) map.current.removeLayer('geojson-layer'); } catch (e) {}
      try { if (map.current.getLayer('geojson-layer-highlight')) map.current.removeLayer('geojson-layer-highlight'); } catch (e) {}
      try { if (map.current.getLayer('geojson-points')) map.current.removeLayer('geojson-points'); } catch (e) {}
      try { if (map.current.getSource('geojson-data')) map.current.removeSource('geojson-data'); } catch (e) {}
    };
  }, [geoJsonData]);

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden border border-border">
      <div ref={mapContainer} className="absolute inset-0" />
      
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading map...</span>
          </div>
        </div>
      )}

      {!geoJsonData && !isLoading && (
        <div className="absolute inset-0 bg-background/60 flex items-center justify-center pointer-events-none">
          <div className="text-center text-muted-foreground">
            <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Load GeoJSON data from an endpoint</p>
          </div>
        </div>
      )}
    </div>
  );
}
