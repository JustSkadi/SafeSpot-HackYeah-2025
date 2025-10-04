import { MapContainer, TileLayer } from 'react-leaflet';
import { useEffect, useState } from 'react';
import { fetchIncidents } from '../utils/csvParser';
import IncidentMarker from './IncidentMarker';

export default function Map() {
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    const load = async () => {
      const data = await fetchIncidents();
      setIncidents(data);
    };
    
    load();
    const interval = setInterval(load, 5 * 60 * 1000); // co 5 min
    return () => clearInterval(interval);
  }, []);

  return (
    <MapContainer center={[52.2297, 21.0122]} zoom={12} style={{height: '100vh'}}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {incidents.map(incident => (
        <IncidentMarker key={incident.id} incident={incident} />
      ))}
    </MapContainer>
  );
}