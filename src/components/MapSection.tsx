import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";

const regions = [
  { name: "All Regions", filter: "all" },
  { name: "Dar es Salaam", filter: "dar" },
  { name: "Arusha", filter: "arusha" },
  { name: "Zanzibar", filter: "zanzibar" },
  { name: "Mwanza", filter: "mwanza" },
  { name: "Dodoma", filter: "dodoma" }
];

const locations = [
  { name: "Kariakoo Market", type: "marketplace", region: "dar", coords: [39.2675, -6.8161], description: "Largest market in East Africa" },
  { name: "Serengeti National Park", type: "event", region: "arusha", coords: [34.8333, -2.3333], description: "Wildlife events & tours" },
  { name: "Stone Town", type: "event", region: "zanzibar", coords: [39.1925, -6.1639], description: "Cultural heritage site" },
  { name: "Nyerere Square", type: "music", region: "dar", coords: [39.2833, -6.8167], description: "Live music venue" },
  { name: "Mount Kilimanjaro", type: "event", region: "arusha", coords: [37.3556, -3.0674], description: "Hiking expeditions" },
  { name: "Forodhani Gardens", type: "marketplace", region: "zanzibar", coords: [39.1947, -6.1619], description: "Night food market" }
];

export const MapSection = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [activeRegion, setActiveRegion] = useState("all");
  const [mapboxToken, setMapboxToken] = useState("");
  const [showTokenInput, setShowTokenInput] = useState(true);
  const markers = useRef<mapboxgl.Marker[]>([]);

  const initializeMap = (token: string) => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = token;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [35.7516, -6.3690],
      zoom: 6,
      pitch: 45,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    map.current.on('style.load', () => {
      addMarkers();
    });
  };

  const addMarkers = () => {
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    const filteredLocations = activeRegion === "all" 
      ? locations 
      : locations.filter(loc => loc.region === activeRegion);

    filteredLocations.forEach(location => {
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.style.width = '40px';
      el.style.height = '40px';
      el.style.cursor = 'pointer';
      
      const color = location.type === 'event' ? '#F59E0B' : 
                    location.type === 'music' ? '#3B82F6' : 
                    '#10B981';
      
      el.innerHTML = `
        <div style="
          width: 100%;
          height: 100%;
          background: ${color};
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>
      `;

      const marker = new mapboxgl.Marker(el)
        .setLngLat(location.coords as [number, number])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(`
              <div style="padding: 8px; min-width: 200px;">
                <h3 style="font-weight: bold; margin-bottom: 4px; color: #1a1a1a;">${location.name}</h3>
                <p style="font-size: 12px; color: #666; margin-bottom: 4px;">${location.description}</p>
                <span style="
                  display: inline-block;
                  padding: 2px 8px;
                  background: ${color};
                  color: white;
                  border-radius: 4px;
                  font-size: 11px;
                  text-transform: capitalize;
                ">${location.type}</span>
              </div>
            `)
        )
        .addTo(map.current!);

      markers.current.push(marker);
    });
  };

  useEffect(() => {
    if (map.current && mapboxToken) {
      addMarkers();
    }
  }, [activeRegion]);

  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mapboxToken) {
      setShowTokenInput(false);
      setTimeout(() => initializeMap(mapboxToken), 100);
    }
  };

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="mb-8">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Explore Tanzania</h2>
        <p className="text-muted-foreground">Interactive map of locations, events, and businesses across Tanzania</p>
      </div>

      {showTokenInput ? (
        <Card className="p-8 max-w-md mx-auto">
          <form onSubmit={handleTokenSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Enter Mapbox Public Token
              </label>
              <Input
                type="text"
                value={mapboxToken}
                onChange={(e) => setMapboxToken(e.target.value)}
                placeholder="pk.eyJ1..."
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Get your free token at{" "}
                <a href="https://mapbox.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  mapbox.com
                </a>
              </p>
            </div>
            <Button type="submit" className="w-full">
              Load Map
            </Button>
          </form>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-6">
            {regions.map((region) => (
              <Button
                key={region.filter}
                variant={activeRegion === region.filter ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveRegion(region.filter)}
                className="gap-2"
              >
                <MapPin className="h-4 w-4" />
                {region.name}
              </Button>
            ))}
          </div>

          <div className="grid lg:grid-cols-4 gap-6">
            <Card className="lg:col-span-3">
              <div ref={mapContainer} className="w-full h-[600px] rounded-lg" />
            </Card>

            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Legend</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-amber-500"></div>
                  <span className="text-sm text-muted-foreground">Events</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                  <span className="text-sm text-muted-foreground">Music Venues</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  <span className="text-sm text-muted-foreground">Marketplace</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <h3 className="font-semibold text-foreground mb-3">Featured Locations</h3>
                <div className="space-y-3">
                  {locations.slice(0, 3).map((location) => (
                    <Card key={location.name} className="p-3 hover:border-primary/50 transition-colors cursor-pointer">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-primary mt-1" />
                        <div>
                          <p className="font-medium text-sm text-foreground">{location.name}</p>
                          <p className="text-xs text-muted-foreground">{location.description}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
};
