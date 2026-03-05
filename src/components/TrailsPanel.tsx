import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchAdminData, updateAdminData, deleteAdminData, createAdminData } from '@/lib/api';
import { DataTable } from '@/components/DataTable';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { uploadFile } from '@/lib/api';
import { Loader2 } from 'lucide-react';

interface Trail {
  id: string;
  name: string;
  distance: number;
  duration: number;
  user_id: string;
  created_at: string;
  [key: string]: unknown;
}

export function TrailsPanel() {
  const { token } = useAuth();
  const [trails, setTrails] = useState<Trail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [name, setName] = useState('');
  const [distance, setDistance] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [description, setDescription] = useState('');
  const [pathPoints, setPathPoints] = useState<[number, number][]>([]); // [lng, lat]
  const [mapLoading, setMapLoading] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [files, setFiles] = useState<File[]>([]);

  const loadTrails = async () => {
    if (!token) return;
    setIsLoading(true);
    const result = await fetchAdminData<Trail[]>('/admin/trails', token);
    if (result.data) {
      setTrails(result.data);
    } else if (result.error) {
      toast.error(result.error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadTrails();
  }, [token]);

  // Initialize map when dialog opens
  useEffect(() => {
    if (!newOpen) {
      // destroy map when dialog closed
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      return;
    }
    // create map (prefer ref to ensure element is present)
    const container = mapContainerRef.current ?? document.getElementById('trail-draw-map');
    if (!container) return;

    mapRef.current = new maplibregl.Map({
      container: container as HTMLElement,
      style: {
        version: 8,
        sources: {
          'carto-tiles': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
              'https://b.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
          },
        },
        layers: [
          { id: 'carto-tiles', type: 'raster', source: 'carto-tiles' },
        ],
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      },
      center: [-8.6730, 37.1028],
      zoom: 10,
    });

    mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    const onLoaded = () => {
      setMapLoading(false);

      // add source/layers for drawn path
      if (!mapRef.current!.getSource('drawn')) {
        mapRef.current!.addSource('drawn', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      }
      if (!mapRef.current!.getLayer('drawn-line')) {
        mapRef.current!.addLayer({ id: 'drawn-line', type: 'line', source: 'drawn', paint: { 'line-color': 'hsl(173,80%,40%)', 'line-width': 3 }, filter: ['==', '$type', 'LineString'] });
      }
      if (!mapRef.current!.getLayer('drawn-points')) {
        mapRef.current!.addLayer({ id: 'drawn-points', type: 'circle', source: 'drawn', paint: { 'circle-radius': 6, 'circle-color': 'hsl(48,95%,50%)' }, filter: ['==', '$type', 'Point'] });
      }

      // click to add points
      mapRef.current!.on('click', (e) => {
        const lng = e.lngLat.lng;
        const lat = e.lngLat.lat;
        setPathPoints((p) => [...p, [lng, lat]]);
      });
    };

    // attach multiple handlers to be robust across render/portal timing
    mapRef.current.on('load', onLoaded);
    mapRef.current.on('idle', onLoaded);
    mapRef.current.on('error', () => setMapLoading(false));

    // sometimes the map is initialized in a hidden/animating dialog; force a resize after a tick
    setTimeout(() => { try { mapRef.current?.resize(); } catch (e) {} }, 200);

    return () => {
      try { mapRef.current?.off('load', onLoaded); mapRef.current?.remove(); mapRef.current = null; } catch (e) {}
    };
  }, [newOpen]);

  // Update drawn source when pathPoints change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getSource('drawn')) return;

    const features: GeoJSON.Feature[] = [];
    if (pathPoints.length === 1) {
      features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: pathPoints[0] }, properties: {} });
    } else if (pathPoints.length > 1) {
      features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: pathPoints }, properties: {} });
      pathPoints.forEach((pt) => features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: pt }, properties: {} }));
    }

    const geo = { type: 'FeatureCollection', features };
    try { (map.getSource('drawn') as any).setData(geo); } catch (e) {}
  }, [pathPoints]);

  const handleUpdate = async (id: string, data: Partial<Trail>) => {
    if (!token) return;
  const result = await updateAdminData(`/admin/trails/${id}`, data, token);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Trail updated');
      loadTrails();
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    const result = await deleteAdminData(`/admin/trails/${id}`, token);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Trail deleted');
      loadTrails();
    }
  };

  const columns = [
    { key: 'id' as const, label: 'ID' },
    { key: 'name' as const, label: 'Name', editable: true },
    { key: 'distance' as const, label: 'Distance (m)' },
    { key: 'duration' as const, label: 'Duration (s)' },
    { key: 'user_id' as const, label: 'User ID' },
    { key: 'created_at' as const, label: 'Created' },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Trails</h2>
          <p className="text-sm text-muted-foreground">{trails.length} trails recorded</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="secondary" size="sm" onClick={loadTrails}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>

          <Dialog open={newOpen} onOpenChange={(open) => {
            setNewOpen(open);
            if (open) setMapLoading(true);
          }}>
            <DialogTrigger asChild>
              <Button size="sm">New Trail</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Trail</DialogTitle>
                <DialogDescription>Provide basic trail info and submit.</DialogDescription>
              </DialogHeader>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!token) return toast.error('Not authenticated');
                  if (!name.trim()) return toast.error('Name is required');

                  const body: any = {
                    name: name.trim(),
                  };
                  if (distance) body.distance = Number(distance);
                  if (duration) body.duration = Number(duration);
                  if (pathPoints && pathPoints.length > 0) body.path = pathPoints;
                  if (city) body.city = city.trim();
                  if (country) body.country = country.trim();
                  if (description) body.description = description.trim();

                  // If files selected, upload them first and collect public URLs
                  if (files && files.length > 0) {
                    body.urls = [];
                    for (const f of files) {
                      const u = await uploadFile('/uploads', f, { filename: f.name }, token);
                      if (u.error) {
                        toast.error(`Upload failed: ${u.error}`);
                        return;
                      }
                      // prefer public_url property if present
                      const publicUrl = u.data?.public_url ?? u.data?.publicUrl ?? u.data?.url ?? u.data?.public_url;
                      if (publicUrl) body.urls.push(publicUrl);
                    }
                  }

                  const result = await createAdminData('/admin/trail', body, token);
                  if (result.error) {
                    toast.error(result.error);
                  } else {
                    toast.success('Trail created');
                    setNewOpen(false);
                    setName('');
                    setDistance('');
                    setDuration('');
                    setCity('');
                    setCountry('');
                    setDescription('');
                    loadTrails();
                  }
                }}
              >
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <Label>Name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div>
                    <Label>Distance (m)</Label>
                    <Input value={distance} onChange={(e) => setDistance(e.target.value)} type="number" />
                  </div>
                  <div>
                    <Label>Duration (s)</Label>
                    <Input value={duration} onChange={(e) => setDuration(e.target.value)} type="number" />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                  <div>
                    <Label>Country</Label>
                    <Input value={country} onChange={(e) => setCountry(e.target.value)} />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                  <div>
                    <Label>Path (draw on map)</Label>
                    <div className="h-48 rounded-md overflow-hidden border border-border">
                      <div id="trail-draw-map" ref={mapContainerRef} className="w-full h-full" />
                      {mapLoading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin" />
                        </div>
                      )}
                      <div className="flex gap-2 mt-2">
                        <Button type="button" size="sm" onClick={() => setPathPoints([])}>Clear Path</Button>
                        <Button type="button" size="sm" onClick={() => {
                          // remove last point
                          setPathPoints((p) => p.slice(0, -1));
                        }}>Undo</Button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label>Images</Label>
                    <input type="file" multiple accept="image/*" onChange={(e) => {
                      const f = e.target.files ? Array.from(e.target.files) : [];
                      setFiles(f);
                    }} />
                  </div>
                </div>

                <DialogFooter className="mt-4">
                  <Button type="submit">Create</Button>
                  <Button variant="ghost" onClick={() => setNewOpen(false)}>Cancel</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <DataTable
        data={trails}
        columns={columns}
        idKey="id"
        isLoading={isLoading}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </div>
  );
}
