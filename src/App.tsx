import { useState } from 'react';
import './App.css';
import DungeonCrawler from './DungeonCrawler';
import Raycaster3D from './3draycaster';

const shirtColors = ['#1976d2', '#43a047', '#e53935', '#fbc02d'];
const hairColors = ['#2d2d2d', '#fbc02d', '#a0522d', '#fff'];
const hairStyles = [
  { name: 'Normal', svg: (color: string) => <ellipse cx="60" cy="30" rx="26" ry="16" fill={color} /> },
  { name: 'Mohawk', svg: (color: string) => <rect x="54" y="8" width="12" height="32" rx="6" fill={color} /> },
  { name: 'Bald', svg: (_: string) => null },
  { name: 'Afro', svg: (color: string) => <ellipse cx="60" cy="18" rx="28" ry="18" fill={color} /> },
  { name: 'Spikes', svg: (color: string) => (
    <g>
      <polygon points="60,2 65,20 55,20" fill={color} />
      <polygon points="45,10 50,28 40,28" fill={color} />
      <polygon points="75,10 80,28 70,28" fill={color} />
    </g>
  ) },
];
const weapons = [
  { name: 'Sledgehammer', color: '#888' },
  { name: 'Axe', color: '#8d5524' },
  { name: 'Pickaxe', color: '#a0522d' },
];

function CharacterPreview({ shirtColor, hairColor, weapon, hairStyle }: { shirtColor: string; hairColor: string; weapon: string; hairStyle: string }) {
  const styleObj = hairStyles.find(h => h.name === hairStyle) || hairStyles[0];
  return (
    <svg width="120" height="160" viewBox="0 0 120 160">
      {/* Head */}
      <circle cx="60" cy="40" r="25" fill="#fcd7b6" stroke="#bfa980" strokeWidth="2" />
      {/* Hair (dynamic) */}
      {styleObj.svg(hairColor)}
      {/* Body/Shirt */}
      <rect x="40" y="65" width="40" height="50" rx="15" fill={shirtColor} />
      {/* Arms */}
      <rect x="25" y="70" width="15" height="40" rx="7" fill="#fcd7b6" />
      <rect x="80" y="70" width="15" height="40" rx="7" fill="#fcd7b6" />
      {/* Weapon */}
      {weapon === 'Sledgehammer' && (
        <g>
          <rect x="92" y="120" width="6" height="40" rx="2" fill="#888" />
          <rect x="86" y="112" width="18" height="12" rx="3" fill="#444" />
        </g>
      )}
      {weapon === 'Axe' && (
        <g>
          <rect x="90" y="120" width="8" height="30" rx="3" fill="#8d5524" />
          <ellipse cx="94" cy="150" rx="12" ry="7" fill="#b0b0b0" />
        </g>
      )}
      {weapon === 'Pickaxe' && (
        <g>
          <rect x="92" y="120" width="6" height="40" rx="2" fill="#a0522d" />
          <polygon points="95,112 110,120 95,128" fill="#b0b0b0" />
          <polygon points="95,112 80,120 95,128" fill="#b0b0b0" />
        </g>
      )}
    </svg>
  );
}

function PlayerSVG({ x, y, shirtColor, hairColor, weapon, hairStyle, swinging, swingDir }: { x: number; y: number; shirtColor: string; hairColor: string; weapon: string; hairStyle: string; swinging?: boolean; swingDir?: {dx: number, dy: number} }) {
  const styleObj = hairStyles.find(h => h.name === hairStyle) || hairStyles[0];
  // Calculate swing angle based on direction
  let angle = 0;
  if (swinging && swingDir) {
    if (swingDir.dx === 1 || swingDir.dy === -1) angle = 90; // right or up: rotate right
    else if (swingDir.dx === -1 || swingDir.dy === 1) angle = -90; // left or down: rotate left
  }
  const weaponTransform = swinging ? `rotate(${angle} 94 140)` : undefined;
  return (
    <svg width="120" height="160" viewBox="0 0 120 160">
      {/* Head */}
      <circle cx="60" cy="40" r="25" fill="#fcd7b6" stroke="#bfa980" strokeWidth="2" />
      {/* Hair (dynamic) */}
      {styleObj.svg(hairColor)}
      {/* Body/Shirt */}
      <rect x="40" y="65" width="40" height="50" rx="15" fill={shirtColor} />
      {/* Arms */}
      <rect x="25" y="70" width="15" height="40" rx="7" fill="#fcd7b6" />
      <rect x="80" y="70" width="15" height="40" rx="7" fill="#fcd7b6" />
      {/* Weapon */}
      {weapon === 'Sledgehammer' && (
        <g transform={weaponTransform}>
          <rect x="92" y="120" width="6" height="40" rx="2" fill="#888" />
          <rect x="86" y="112" width="18" height="12" rx="3" fill="#444" />
        </g>
      )}
      {weapon === 'Axe' && (
        <g transform={weaponTransform}>
          <rect x="90" y="120" width="8" height="30" rx="3" fill="#8d5524" />
          <ellipse cx="94" cy="150" rx="12" ry="7" fill="#b0b0b0" />
        </g>
      )}
      {weapon === 'Pickaxe' && (
        <g transform={weaponTransform}>
          <rect x="92" y="120" width="6" height="40" rx="2" fill="#a0522d" />
          <polygon points="95,112 110,120 95,128" fill="#b0b0b0" />
          <polygon points="95,112 80,120 95,128" fill="#b0b0b0" />
        </g>
      )}
    </svg>
  );
}

function App() {
  const [shirtColor, setShirtColor] = useState(shirtColors[0]);
  const [hairColor, setHairColor] = useState(hairColors[0]);
  const [hairStyle, setHairStyle] = useState(hairStyles[0].name);
  const [weapon, setWeapon] = useState(weapons[0].name);
  const [customized, setCustomized] = useState(false);
  const [character, setCharacter] = useState<{ shirtColor: string; hairColor: string; weapon: string; hairStyle: string; name: string } | null>(null);
  const [name, setName] = useState("");
  const [mode, setMode] = useState<null | '2d' | '3d'>(null);

  if (!customized) {
    return (
      <div className="customize-container">
        <h1 style={{
          fontFamily: 'MedievalSharp, "Cinzel Decorative", "UnifrakturCook", "Old English Text MT", cursive',
          fontSize: '2.4rem',
          marginBottom: '1.2rem',
          letterSpacing: '1px',
          color: '#e6d28a',
          textShadow: '0 2px 8px #000, 0 0 2px #bfa980'
        }}>Mystery Miner</h1>
        <div className="customize-columns">
          {/* Column 1: Character + Name */}
          <div className="customize-col">
            <CharacterPreview shirtColor={shirtColor} hairColor={hairColor} weapon={weapon} hairStyle={hairStyle} />
            <div style={{ margin: '1.5rem 0', width: '100%' }}>
              <label htmlFor="character-name" style={{ fontWeight: 600, fontSize: '1.1rem' }}>Name</label>
              <input
                id="character-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter your hero's name"
                style={{
                  display: 'block',
                  margin: '0.5rem auto',
                  padding: '0.5rem 1rem',
                  fontSize: '1.1rem',
                  borderRadius: 8,
                  border: '1px solid #ccc',
                  width: '80%'
                }}
                maxLength={20}
                autoComplete="off"
              />
            </div>
          </div>
          {/* Column 2: Shirt + Hair Color */}
          <div className="customize-col">
            <div>
              <h2>Shirt Color</h2>
              <div className="color-options">
                {shirtColors.map((color) => (
                  <button
                    key={color}
                    className="color-btn"
                    style={{ background: color, border: shirtColor === color ? '3px solid #333' : '1px solid #ccc' }}
                    onClick={() => setShirtColor(color)}
                    aria-label={`Shirt color ${color}`}
                  />
                ))}
              </div>
            </div>
            <div style={{ marginTop: '2rem' }}>
              <h2>Hair Color</h2>
              <div className="color-options">
                {hairColors.map((color) => (
                  <button
                    key={color}
                    className="color-btn"
                    style={{ background: color, border: hairColor === color ? '3px solid #333' : '1px solid #ccc' }}
                    onClick={() => setHairColor(color)}
                    aria-label={`Hair color ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>
          {/* Column 3: Weapon + Hair Style */}
          <div className="customize-col">
            <div>
              <h2>Weapon</h2>
              <div className="weapon-options">
                {weapons.map((w) => (
                  <button
                    key={w.name}
                    className="weapon-btn"
                    style={{ border: weapon === w.name ? '3px solid #1976d2' : '1px solid #ccc' }}
                    onClick={() => setWeapon(w.name)}
                    aria-label={`Weapon ${w.name}`}
                  >
                    {w.name}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginTop: '2rem' }}>
              <h2>Hair Style</h2>
              <div className="hair-style-options">
                {hairStyles.map((h) => (
                  <button
                    key={h.name}
                    className="hair-style-btn"
                    style={{ border: hairStyle === h.name ? '3px solid #1976d2' : '1px solid #ccc' }}
                    onClick={() => setHairStyle(h.name)}
                    aria-label={`Hair style ${h.name}`}
                  >
                    {h.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
          <button
            className="start-btn"
            onClick={() => {
              const charData = { shirtColor, hairColor, weapon, hairStyle, name: name.trim() || "Grognak the Barbarian" };
              setCharacter(charData);
              localStorage.setItem('character-custom', JSON.stringify(charData));
              setCustomized(true);
            }}
            disabled={!name.trim()}
            style={{ minWidth: 160 }}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // New: Mode selection screen
  if (mode === null) {
    return (
      <div className="customize-container" style={{ minWidth: 320, maxWidth: 420, textAlign: 'center' }}>
        <h1 style={{
          fontFamily: 'MedievalSharp, "Cinzel Decorative", "UnifrakturCook", "Old English Text MT", cursive',
          fontSize: '2.2rem',
          marginBottom: '1.2rem',
          letterSpacing: '1px',
          color: '#e6d28a',
          textShadow: '0 2px 8px #000, 0 0 2px #bfa980'
        }}>Choose Game Mode</h1>
        <div style={{ display: 'flex', flexDirection: 'row', gap: '2rem', justifyContent: 'center', margin: '2.5rem 0' }}>
          <button className="start-btn" style={{ fontSize: '1.3rem', minWidth: 120 }} onClick={() => setMode('2d')}>2D</button>
          <button className="start-btn" style={{ fontSize: '1.3rem', minWidth: 120, background: '#888' }} onClick={() => setMode('3d')}>3D</button>
        </div>
        <div style={{ color: '#888', fontSize: '1.1rem', marginTop: '1.5rem' }}>
          2D: Classic top-down dungeon<br />3D: (Coming soon)
        </div>
      </div>
    );
  }

  // Show the dungeon crawler game after customization and mode selection
  if (mode === '2d') {
    return <DungeonCrawler character={character ?? undefined} />;
  }
  // Show 3D raycaster mode
  if (mode === '3d' && character) {
    return <Raycaster3D character={character} />;
  }
}

export default App;
