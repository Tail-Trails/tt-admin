import { useEffect, useState } from 'react';
import { MapViewer } from '@/components/MapViewer';
import { useAuth } from '@/contexts/AuthContext';
import { fetchAdminData } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Trail {
  id: string;
  name: string;
  geojson?: GeoJSON.Feature | GeoJSON.FeatureCollection;
  coordinates?: Array<{ lat: number; lng: number }>;
  [key: string]: unknown;
}

export function AdminMapPanel() {
  const { token } = useAuth();
  const [geoJsonData, setGeoJsonData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [trailCount, setTrailCount] = useState(0);

  const loadTrails = async () => {
    if (!token) return;
    
    setIsLoading(true);
    const result = await fetchAdminData<Trail[]>('/admin/trails', token);
    
    if (result.data && Array.isArray(result.data)) {
      setTrailCount(result.data.length);
      
      // Convert trails to GeoJSON
      const features: GeoJSON.Feature[] = result.data
        .map(trail => {
          // Use provided geojson if available
          if (trail.geojson) {
            if (trail.geojson.type === 'FeatureCollection') {
              // attach trail properties to the first feature
              const feat = trail.geojson.features[0];
              feat.properties = { ...(feat.properties || {}), id: trail.id, name: trail.name, distance: trail.distance, duration: trail.duration };
              return feat;
            }
            (trail.geojson as GeoJSON.Feature).properties = { ...(trail.geojson as GeoJSON.Feature).properties, id: trail.id, name: trail.name, distance: trail.distance, duration: trail.duration };
            return trail.geojson as GeoJSON.Feature;
          }

          // Convert `path` arrays (array of [lng, lat]) if present
          const anyTrail = trail as any;
          if (Array.isArray(anyTrail.path) && anyTrail.path.length > 0) {
            return {
              type: 'Feature' as const,
              properties: {
                id: trail.id,
                name: trail.name,
                distance: trail.distance,
                duration: trail.duration,
                pace: anyTrail.pace,
                description: anyTrail.description,
                startLatitude: anyTrail.startLatitude,
                startLongitude: anyTrail.startLongitude,
              },
              geometry: {
                type: 'LineString' as const,
                // API returns arrays like [lng, lat]
                coordinates: anyTrail.path.map((p: any) => [p[0], p[1]]),
              },
            };
          }

          // fallback: ignore trails without geometry
          return null;
        })
        .filter((f): f is GeoJSON.Feature => f !== null);

      if (features.length > 0) {
        setGeoJsonData({ type: 'FeatureCollection', features });
        toast.success(`Loaded ${features.length} trails on map`);
      } else {
        setGeoJsonData(null);
        toast.info('No trail geometry data available');
      }
    } else if (result.error) {
      toast.error(result.error);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    loadTrails();
  }, [token]);

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Trail Map</h2>
          <p className="text-sm text-muted-foreground">
            {trailCount} trails • {geoJsonData?.features.length || 0} with geometry
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={loadTrails} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      <div className="flex-1">
        <MapViewer geoJsonData={geoJsonData} />
      </div>
    </div>
  );
}
