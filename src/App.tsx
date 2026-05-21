import { Header } from './components/Header';
import { MapCanvas } from './components/MapCanvas';
import { TimeScrubber } from './components/TimeScrubber';
import { IncidentDetail } from './components/IncidentDetail';
import { AlertTicker } from './components/AlertTicker';
import { Legend } from './components/Legend';

export default function App() {
  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--bg)',
      }}
      className="grain"
    >
      <MapCanvas />
      <Header />
      <AlertTicker />
      <Legend />
      <IncidentDetail />
      <TimeScrubber />
    </div>
  );
}
