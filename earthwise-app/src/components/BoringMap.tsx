import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import type { SoilCharacteristic } from '../types';

// Fix Leaflet default marker icon (broken in bundlers due to asset path issues)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Custom marker icons
function createIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
    html: `<div style="
      width: 28px; height: 28px;
      background: ${color};
      border: 2px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    "><div style="
      width: 10px; height: 10px;
      background: white;
      border-radius: 50%;
      margin: 7px auto;
    "></div></div>`,
  });
}

const ACCENT_ICON = createIcon('#6366f1');
const RED_FLAG_ICON = createIcon('#ef4444');

const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const LIGHT_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const DARK_ATTR = '&copy; <a href="https://carto.com/">CARTO</a>';
const LIGHT_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

interface BoringMapProps {
  borings: SoilCharacteristic[];
  siteLatitude?: number | null;
  siteLongitude?: number | null;
}

/** Auto-fit the map bounds to all markers */
function FitBounds({ positions }: { positions: L.LatLngExpression[] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      const [lat, lng] = positions[0] as [number, number];
      map.setView([lat, lng], 15);
    } else {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [map, positions]);

  return null;
}

export default function BoringMap({ borings, siteLatitude, siteLongitude }: BoringMapProps) {
  const { theme } = useTheme();

  const boringsWithCoords = useMemo(
    () => borings.filter((b) => b.latitude != null && b.longitude != null),
    [borings]
  );

  const positions: [number, number][] = useMemo(
    () => boringsWithCoords.map((b) => [b.latitude!, b.longitude!]),
    [boringsWithCoords]
  );

  // Determine map center
  const center: [number, number] = useMemo(() => {
    if (positions.length > 0) return positions[0];
    if (siteLatitude != null && siteLongitude != null) return [siteLatitude, siteLongitude];
    return [39.8283, -98.5795]; // US center fallback
  }, [positions, siteLatitude, siteLongitude]);

  if (boringsWithCoords.length === 0) {
    return (
      <div className="bg-[var(--card-bg)] rounded-lg shadow-lg mb-6">
        <div className="px-6 py-4 border-b border-[var(--border-color)]">
          <h2
            className="font-semibold text-lg text-[var(--text-primary)]"
            style={{ fontFamily: 'var(--font-oswald)' }}
          >
            Boring Locations
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
          <MapPin size={40} className="mb-3 opacity-50" />
          <p className="text-sm">No boring coordinates available for this report.</p>
          <p className="text-xs mt-1">Coordinates are extracted from boring logs when present in the PDF.</p>
        </div>
      </div>
    );
  }

  const tileUrl = theme === 'dark' ? DARK_TILES : LIGHT_TILES;
  const tileAttr = theme === 'dark' ? DARK_ATTR : LIGHT_ATTR;

  return (
    <div className="bg-[var(--card-bg)] rounded-lg shadow-lg mb-6 overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--border-color)]">
        <h2
          className="font-semibold text-lg text-[var(--text-primary)]"
          style={{ fontFamily: 'var(--font-oswald)' }}
        >
          Boring Locations
        </h2>
      </div>
      <div className="h-[400px]">
        <MapContainer
          center={center}
          zoom={15}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer url={tileUrl} attribution={tileAttr} />
          <FitBounds positions={positions} />

          {boringsWithCoords.map((b) => (
            <Marker
              key={b.boringId}
              position={[b.latitude!, b.longitude!]}
              icon={b.redFlagIndicators.length > 0 ? RED_FLAG_ICON : ACCENT_ICON}
            >
              <Popup>
                <div style={{ minWidth: 160, fontFamily: 'var(--font-oswald)' }}>
                  <strong style={{ fontSize: 14 }}>{b.boringId}</strong>
                  <div style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
                    {b.soilTypes.slice(0, 3).map((t) => (
                      <div key={t}>{t}</div>
                    ))}
                    {b.soilTypes.length > 3 && (
                      <div style={{ fontStyle: 'italic' }}>+{b.soilTypes.length - 3} more</div>
                    )}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 11 }}>
                    <span style={{ fontWeight: 600 }}>Refusal:</span> {b.refusalDepth}
                  </div>
                  {b.redFlagIndicators.length > 0 && (
                    <div style={{ marginTop: 4, fontSize: 11, color: '#ef4444' }}>
                      {b.redFlagIndicators.join(', ')}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
