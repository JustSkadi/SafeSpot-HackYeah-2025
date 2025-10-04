import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const icons = {
  high: L.icon({ iconUrl: '/icons/red-marker.png', iconSize: [25, 41] }),
  medium: L.icon({ iconUrl: '/icons/orange-marker.png', iconSize: [25, 41] }),
  low: L.icon({ iconUrl: '/icons/yellow-marker.png', iconSize: [25, 41] })
};

export default function IncidentMarker({ incident }) {
  return (
    <Marker position={[incident.lat, incident.lon]} icon={icons[incident.severity]}>
      <Popup>
        <strong>{incident.type}</strong><br/>
        {incident.summary}<br/>
        <small>{new Date(incident.timestamp).toLocaleString('pl-PL')}</small><br/>
        <a href={incident.source_url} target="_blank" rel="noreferrer">Źródło</a>
      </Popup>
    </Marker>
  );
}