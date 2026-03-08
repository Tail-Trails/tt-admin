import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useAuth } from '@/contexts/AuthContext';
import { createAdminData, uploadFile } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function NewTrail() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [distance, setDistance] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const [pathPoints, setPathPoints] = useState<[number, number][]>([]);
  const [mapLoading, setMapLoading] = useState(true);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    mapRef.current = new maplibregl.Map({
      container,
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
        layers: [{ id: 'carto-tiles', type: 'raster', source: 'carto-tiles' }],
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      },
      center: [-8.6730, 37.1028],
      zoom: 10,
    });

    mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    const onLoaded = () => {
      setMapLoading(false);

      try {
        if (!mapRef.current!.getSource('drawn')) {
          mapRef.current!.addSource('drawn', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        }
        if (!mapRef.current!.getLayer('drawn-line')) {
          mapRef.current!.addLayer({ id: 'drawn-line', type: 'line', source: 'drawn', paint: { 'line-color': 'hsl(173,80%,40%)', 'line-width': 3 }, filter: ['==', '$type', 'LineString'] });
        }
        if (!mapRef.current!.getLayer('drawn-points')) {
          mapRef.current!.addLayer({ id: 'drawn-points', type: 'circle', source: 'drawn', paint: { 'circle-radius': 6, 'circle-color': 'hsl(48,95%,50%)' }, filter: ['==', '$type', 'Point'] });
        }
      } catch (e) {}

      mapRef.current!.on('click', (e) => {
        const lng = e.lngLat.lng;
        const lat = e.lngLat.lat;
        setPathPoints((p) => [...p, [lng, lat]]);
      });
    };

    mapRef.current.on('load', onLoaded);
    mapRef.current.on('idle', onLoaded);

    setTimeout(() => { try { mapRef.current?.resize(); } catch (e) {} }, 200);

    return () => {
      try { mapRef.current?.remove(); mapRef.current = null; } catch (e) {}
    };
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return toast.error('Not authenticated');
    if (!name.trim()) return toast.error('Name is required');

    const body: any = { name: name.trim() };
    if (distance) body.distance = Number(distance);
    if (duration) body.duration = Number(duration);
    if (pathPoints && pathPoints.length > 0) body.path = pathPoints;
    if (city) body.city = city.trim();
    if (country) body.country = country.trim();
    if (description) body.description = description.trim();

    if (files && files.length > 0) {
      body.urls = [];
      for (const f of files) {
        const u = await uploadFile('/uploads', f, { filename: f.name }, token);
        if (u.error) {
          toast.error(`Upload failed: ${u.error}`);
          return;
        }
        const publicUrl = u.data?.public_url ?? u.data?.publicUrl ?? u.data?.url;
        if (publicUrl) body.urls.push(publicUrl);
      }
    }

    const result = await createAdminData('/admin/trail', body, token);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Trail created');
      navigate('/');
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <main className="flex-1 p-6">
        <header className="mb-4">
          <h1 className="text-xl font-semibold">Create New Trail</h1>
          <p className="text-sm text-muted-foreground">Draw the path on the map and fill details on the right.</p>
        </header>

        <div className="flex gap-6">
          <div className="flex-1 rounded-md overflow-hidden border border-border">
            <div ref={mapContainerRef} className="w-full h-[70vh]" />
            <div className="p-3 flex gap-2">
              <Button size="sm" onClick={() => setPathPoints([])}>Clear Path</Button>
              <Button size="sm" onClick={() => setPathPoints((p) => p.slice(0, -1))}>Undo</Button>
            </div>
          </div>

          <aside className="w-96">
            <form onSubmit={handleSubmit} className="space-y-3 bg-card p-4 rounded-md border border-border">
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
                <Label>Images</Label>
                <input type="file" multiple accept="image/*" onChange={(e) => {
                  const f = e.target.files ? Array.from(e.target.files) : [];
                  setFiles(f);
                }} />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
                <Button type="submit">Create Trail</Button>
              </div>
            </form>
          </aside>
        </div>
      </main>
    </div>
  );
}
