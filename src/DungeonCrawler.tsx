import React, { useMemo, useState, useEffect, useRef } from 'react';
// @ts-ignore
import explosionSound from './assets/explosion.mp3';
import bgMusic from './assets/medieval-bg.mp3';

const TILE_SIZE = 32;
const MAP_WIDTH = 30; // Increased width
const MAP_HEIGHT = 20; // Increased height
const ROOM_MAX_SIZE = 8;
const ROOM_MIN_SIZE = 4;
const ROOM_ATTEMPTS = 18;

type Tile = 0 | 1; // 0 = wall, 1 = floor
interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
  center: [number, number];
}
// Add types for wall events
interface WallEvent {
  type: 'none' | 'cheap-treasure' | 'trap' | 'expensive-treasure';
}
function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function createDungeon(): Tile[][] {
  const map: Tile[][] = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(0));
  const rooms: Room[] = [];
  for (let i = 0; i < ROOM_ATTEMPTS; i++) {
    const w = randomInt(ROOM_MIN_SIZE, ROOM_MAX_SIZE);
    const h = randomInt(ROOM_MIN_SIZE, ROOM_MAX_SIZE);
    const x = randomInt(1, MAP_WIDTH - w - 1);
    const y = randomInt(1, MAP_HEIGHT - h - 1);
    const newRoom: Room = { x, y, w, h, center: [x + Math.floor(w / 2), y + Math.floor(h / 2)] };
    let failed = false;
    for (const other of rooms) {
      if (
        x < other.x + other.w &&
        x + w > other.x &&
        y < other.y + other.h &&
        y + h > other.y
      ) {
        failed = true;
        break;
      }
    }
    if (!failed) {
      for (let ry = y; ry < y + h; ry++) {
        for (let rx = x; rx < x + w; rx++) {
          map[ry][rx] = 1;
        }
      }
      if (rooms.length > 0) {
        const [prevX, prevY] = rooms[rooms.length - 1].center;
        const [currX, currY] = newRoom.center;
        if (Math.random() < 0.5) {
          for (let tx = Math.min(prevX, currX); tx <= Math.max(prevX, currX); tx++) map[prevY][tx] = 1;
          for (let ty = Math.min(prevY, currY); ty <= Math.max(prevY, currY); ty++) map[ty][currX] = 1;
        } else {
          for (let ty = Math.min(prevY, currY); ty <= Math.max(prevY, currY); ty++) map[ty][prevX] = 1;
          for (let tx = Math.min(prevX, currX); tx <= Math.max(prevX, currX); tx++) map[currY][tx] = 1;
        }
      }
      rooms.push(newRoom);
    }
  }
  return map;
}

// Duplicate hairStyles here for use in DungeonCrawler
const hairStyles = [
  { name: 'Normal', svg: (color: string) => <ellipse cx="0" cy="-32" rx="26" ry="16" fill={color} /> },
  { name: 'Mohawk', svg: (color: string) => <rect x="-6" y="-44" width="12" height="32" rx="6" fill={color} /> },
  { name: 'Bald', svg: (_: string) => null },
  { name: 'Afro', svg: (color: string) => <ellipse cx="0" cy="-42" rx="28" ry="18" fill={color} /> },
  { name: 'Spikes', svg: (color: string) => (
    <g>
      <polygon points="0,-58 5,-40 -5,-40" fill={color} />
      <polygon points="-15,-50 -10,-32 -20,-32" fill={color} />
      <polygon points="15,-50 20,-32 10,-32" fill={color} />
    </g>
  ) },
];

function PlayerSVG({ x, y, shirtColor, hairColor, weapon, hairStyle, swinging, swingDir }: { x: number; y: number; shirtColor: string; hairColor: string; weapon: string; hairStyle: string; swinging?: boolean; swingDir?: {dx: number, dy: number} }) {
  const styleObj = hairStyles.find(h => h.name === hairStyle) || hairStyles[0];
  // Calculate swing angle and translation based on direction
  let angle = 0;
  let translate = '';
  if (swinging && swingDir) {
    if (swingDir.dx === 1) angle = 90; // right
    else if (swingDir.dx === -1) angle = -90; // left
    else if (swingDir.dy === 1) angle = -180; // down
    else if (swingDir.dy === -1) translate = 'translate(0,-18)'; // up: push weapon up
  }
  const weaponTransform = swinging
    ? `${translate} rotate(${angle} 16 20)`
    : undefined;
  return (
    <g transform={`translate(${x * TILE_SIZE + TILE_SIZE / 2},${y * TILE_SIZE + TILE_SIZE / 2})`}>
      {/* Head */}
      <circle cx={0} cy={-20} r={12} fill="#fcd7b6" stroke="#bfa980" strokeWidth={2} />
      {/* Hair */}
      {styleObj.svg(hairColor)}
      {/* Body/Shirt */}
      <rect x={-10} y={-8} width={20} height={24} rx={7} fill={shirtColor} />
      {/* Arms */}
      <rect x={-18} y={-8} width={8} height={20} rx={4} fill="#fcd7b6" />
      <rect x={10} y={-8} width={8} height={20} rx={4} fill="#fcd7b6" />
      {/* Weapon */}
      {weapon === 'Sledgehammer' && (
        <g transform={weaponTransform}>
          <rect x={14} y={0} width={6} height={20} rx={2} fill="#888" />
          <rect x={10} y={-8} width={14} height={8} rx={2} fill="#444" />
        </g>
      )}
      {weapon === 'Axe' && (
        <g transform={weaponTransform}>
          <rect x={14} y={4} width={5} height={16} rx={2} fill="#8d5524" />
          <ellipse cx={16.5} cy={4} rx={8} ry={4} fill="#b0b0b0" />
        </g>
      )}
      {weapon === 'Pickaxe' && (
        <g transform={weaponTransform}>
          <rect x={14} y={0} width={6} height={20} rx={2} fill="#a0522d" />
          <polygon points="17,-8 28,0 17,8" fill="#b0b0b0" />
          <polygon points="17,-8 6,0 17,8" fill="#b0b0b0" />
        </g>
      )}
      {weapon === 'Sword' && (
        <g transform={swinging ? 'rotate(-45)' : ''}>
          <rect x={14} y={0} width={5} height={20} rx={2} fill="#b0b0b0" />
          <rect x={12} y={16} width={9} height={5} rx={2} fill="#d4af37" />
        </g>
      )}
      {weapon === 'Bow' && (
        <g transform={swinging ? 'rotate(-45)' : ''}>
          <rect x={14} y={0} width={3} height={20} rx={1.5} fill="#a0522d" />
          <path d="M 16 0 Q 28 10 16 20" stroke="#a0522d" strokeWidth={3} fill="none" />
          <line x1={16} y1={0} x2={16} y2={20} stroke="#fff" strokeWidth={1.5} />
        </g>
      )}
      {weapon === 'Staff' && (
        <g transform={swinging ? 'rotate(-45)' : ''}>
          <rect x={14} y={0} width={5} height={20} rx={2} fill="#6a4f1b" />
          <circle cx={16.5} cy={0} r={4} fill="#bfa980" />
        </g>
      )}
    </g>
  );
}

export default function DungeonCrawler({ character, exposeState }: { character?: { shirtColor: string; hairColor: string; weapon: string; hairStyle: string; name: string }, exposeState?: (state: any) => void }) {
  // Make map stateful so it can be updated
  const [map, setMap] = useState(() => createDungeon());
  // Add state for wall events
  const [wallEvents, setWallEvents] = useState<{ [key: string]: WallEvent }>({});
  // Add state for score and floating points
  const [score, setScore] = useState(0);
  const [floatingPoints, setFloatingPoints] = useState<{ x: number; y: number; value: number; key: number } | null>(null);
  let floatingKey = useRef(0);
  // Add state for active trap timers and destroyed traps
  const [trapTimers, setTrapTimers] = useState<{ [key: string]: ReturnType<typeof setTimeout> }>({});
  const [deadTraps, setDeadTraps] = useState<{ [key: string]: boolean }>({});
  // Add state for trap hit status
  const [trapHits, setTrapHits] = useState<{ [key: string]: boolean }>({});
  // Add state for trap flashing (armed)
  const [trapFlash, setTrapFlash] = useState<{ [key: string]: boolean }>({});
  // Find a floor tile for player start
  const start = useMemo(() => {
    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[0].length; x++) {
        if (map[y][x] === 1) return { x, y };
      }
    }
    return { x: 1, y: 1 };
  }, [map]);
  const [player, setPlayer] = useState(start);
  // Add state for weapon swing
  const [swinging, setSwinging] = useState(false);
  // Add state for last direction
  const [lastDir, setLastDir] = useState<{dx: number, dy: number}>({dx: 0, dy: 0});
  // Get character customization from prop or localStorage
  const [custom, setCustom] = useState<{ shirtColor: string; hairColor: string; weapon: string; hairStyle: string; name: string } | null>(character ?? null);
  useEffect(() => {
    if (!custom) {
      const data = localStorage.getItem('character-custom');
      if (data) setCustom(JSON.parse(data));
    }
  }, [custom]);
  // Audio refs for real playback
  const bgMusicRef = useRef<HTMLAudioElement|null>(null);
  const explosionRef = useRef<HTMLAudioElement|null>(null);

  // Play background music (looped, only once, with user gesture requirement workaround)
  useEffect(() => {
    function startMusic() {
      if (!bgMusicRef.current) {
        const audio = new Audio(bgMusic);
        audio.loop = true;
        audio.volume = 0.35;
        audio.play().catch(() => {});
        bgMusicRef.current = audio;
      } else {
        bgMusicRef.current.play().catch(() => {});
      }
      window.removeEventListener('pointerdown', startMusic);
    }
    window.addEventListener('pointerdown', startMusic);
    return () => {
      bgMusicRef.current?.pause();
      bgMusicRef.current = null;
      window.removeEventListener('pointerdown', startMusic);
    };
  }, []);
  // Keyboard movement and weapon swing
  const moveRef = useRef(player);
  moveRef.current = player;
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      let { x, y } = moveRef.current;
      let dx = 0, dy = 0;
      if (e.key === 'ArrowUp' || e.key === 'w') { dy = -1; }
      if (e.key === 'ArrowDown' || e.key === 's') { dy = 1; }
      if (e.key === 'ArrowLeft' || e.key === 'a') { dx = -1; }
      if (e.key === 'ArrowRight' || e.key === 'd') { dx = 1; }
      if (dx !== 0 || dy !== 0) setLastDir({dx, dy});
      if (map[y + dy] && map[y + dy][x + dx] === 1) setPlayer({ x: x + dx, y: y + dy });
      if (e.code === 'Space' && !swinging) {
        setSwinging(true);
        // If facing a wall, break it
        const tx = player.x + lastDir.dx;
        const ty = player.y + lastDir.dy;
        if (map[ty] && map[ty][tx] === 0) {
          // Create a new map with the wall destroyed
          const newMap = map.map(row => [...row]);
          newMap[ty][tx] = 1;
          setMap(newMap);
          // Roll for event
          const key = `${tx},${ty}`;
          if (!wallEvents[key]) {
            const roll = Math.random();
            let event: WallEvent = { type: 'none' };
            if (roll < 0.10) event = { type: 'expensive-treasure' };
            else if (roll < 0.40) event = { type: 'trap' }; // 30% for trap (0.10-0.40)
            else if (roll < 0.70) event = { type: 'cheap-treasure' }; // 30% for cheap (0.40-0.70)
            setWallEvents(prev => ({ ...prev, [key]: event }));
          }
        }
        setTimeout(() => setSwinging(false), 250);
      }
    }
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [map, swinging, lastDir, player, wallEvents]);
  // Player pickup logic
  useEffect(() => {
    // Check if player is on a treasure
    const key = `${player.x},${player.y}`;
    const event = wallEvents[key];
    if (event && (event.type === 'cheap-treasure' || event.type === 'expensive-treasure')) {
      let points = 0;
      if (event.type === 'cheap-treasure') points = 500;
      if (event.type === 'expensive-treasure') points = 1000;
      setScore(s => s + points);
      floatingKey.current++;
      setFloatingPoints({ x: player.x, y: player.y, value: points, key: floatingKey.current });
      // Remove the treasure from the map
      setWallEvents(prev => {
        const copy = { ...prev };
        copy[key] = { type: 'none' };
        return copy;
      });
      // Hide floating points after 1/3 second
      setTimeout(() => {
        setFloatingPoints(fp => (fp && fp.key === floatingKey.current ? null : fp));
      }, 333);
    }
  }, [player, wallEvents]);

  // Trap logic: start timer when trap appears, explode after 1s unless destroyed
  useEffect(() => {
    Object.entries(wallEvents).forEach(([key, event]) => {
      if (event && event.type === 'trap' && !trapTimers[key] && !deadTraps[key] && trapHits[key]) {
        // Start a timer for this trap (explosion after 1s)
        const timeout = setTimeout(() => {
          setWallEvents(prev => {
            const copy = { ...prev };
            copy[key] = { type: 'none' };
            // Destroy all 8 surrounding blocks (including diagonals)
            const [x, y] = key.split(',').map(Number);
            const adj = [
              [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y],
              [x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1], [x + 1, y + 1]
            ];
            for (const [ax, ay] of adj) {
              const adjKey = `${ax},${ay}`;
              // If it's a wall, turn it into walkable ground
              if (map[ay] && map[ay][ax] === 0) {
                setMap(prevMap => {
                  const newMap = prevMap.map(row => [...row]);
                  newMap[ay][ax] = 1;
                  return newMap;
                });
              }
              // Remove any wall event (treasure/trap) as well
              if (prev[adjKey] && prev[adjKey].type !== 'none') {
                copy[adjKey] = { type: 'none' };
              }
            }
            return copy;
          });
          setTrapTimers(prev => {
            const copy = { ...prev };
            delete copy[key];
            return copy;
          });
          setTrapHits(prev => {
            const copy = { ...prev };
            delete copy[key];
            return copy;
          });
          setTrapFlash(prev => {
            const copy = { ...prev };
            delete copy[key];
            return copy;
          });
        }, 1000); // 1 second
        setTrapTimers(prev => ({ ...prev, [key]: timeout }));
        setTrapFlash(prev => ({ ...prev, [key]: true }));
      }
      // Clean up timer if trap is gone
      if (event && event.type !== 'trap' && trapTimers[key]) {
        clearTimeout(trapTimers[key]);
        setTrapTimers(prev => {
          const copy = { ...prev };
          delete copy[key];
          return copy;
        });
        setTrapFlash(prev => {
          const copy = { ...prev };
          delete copy[key];
          return copy;
        });
      }
    });
    // Clean up on unmount
    return () => {
      Object.values(trapTimers).forEach(clearTimeout);
    };
  }, [wallEvents, trapTimers, deadTraps, trapHits]);

  // Trap flashing animation (toggle every 200ms while armed)
  useEffect(() => {
    const flashingKeys = Object.keys(trapHits).filter(k => trapHits[k] && !deadTraps[k]);
    if (flashingKeys.length === 0) return;
    const interval = setInterval(() => {
      setTrapFlash(prev => {
        const copy = { ...prev };
        for (const k of flashingKeys) {
          copy[k] = !prev[k];
        }
        return copy;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [Object.keys(trapHits).filter(k => trapHits[k] && !deadTraps[k]).join(",")]);

  // Weapon swing: destroy trap if hit (require one hit to arm, second hit to destroy)
  useEffect(() => {
    if (!swinging) return;
    // Check if swinging into a trap
    const tx = player.x + lastDir.dx;
    const ty = player.y + lastDir.dy;
    const key = `${tx},${ty}`;
    const event = wallEvents[key];
    if (event && event.type === 'trap' && !deadTraps[key]) {
      if (!trapHits[key]) {
        // First hit: arm the trap (mark as hit, but do not destroy)
        setTrapHits(prev => ({ ...prev, [key]: true }));
        setTrapFlash(prev => ({ ...prev, [key]: true }));
        // Do NOT unarm or stop flashing other traps
      } else {
        // Second hit: destroy the trap
        setDeadTraps(prev => ({ ...prev, [key]: true }));
        setWallEvents(prev => {
          const copy = { ...prev };
          copy[key] = { type: 'none' };
          return copy;
        });
        if (trapTimers[key]) {
          clearTimeout(trapTimers[key]);
          setTrapTimers(prev => {
            const copy = { ...prev };
            delete copy[key];
            return copy;
          });
        }
        setTrapHits(prev => {
          const copy = { ...prev };
          delete copy[key];
          return copy;
        });
        setTrapFlash(prev => {
          const copy = { ...prev };
          delete copy[key];
          return copy;
        });
      }
    }
  }, [swinging]);
  // Play explosion sound when a trap explodes (with real <audio> element)
  useEffect(() => {
    // Find traps that just exploded (removed from wallEvents, but had a timer)
    const prevTrapKeys = Object.keys(trapTimers);
    if (prevTrapKeys.length === 0) return;
    prevTrapKeys.forEach(key => {
      if (!wallEvents[key] && trapTimers[key]) {
        // Force reload the audio element for reliable playback
        if (explosionRef.current) {
          explosionRef.current.pause();
          explosionRef.current.currentTime = 0;
          // To ensure the sound always plays, reload the src
          explosionRef.current.src = explosionSound;
          explosionRef.current.load();
          explosionRef.current.play().catch(() => {});
        }
      }
    });
  }, [wallEvents]);
  useEffect(() => {
    if (exposeState) {
      // Add lastDir to wallEvents as a string type: 'dir:dx,dy'
      const wallEventsWithDir = {
        ...wallEvents,
        __lastDir: { type: `dir:${lastDir.dx},${lastDir.dy}` }
      };
      exposeState({
        map,
        player,
        wallEvents: wallEventsWithDir,
        custom,
        score
      });
    }
  }, [map, player, wallEvents, custom, score, exposeState, lastDir]);
  if (!custom) return <p>Loading character...</p>;
  return (
    <div style={{ textAlign: 'center', marginTop: '1rem', position: 'relative' }}>
      {/* Hidden audio elements for real playback */}
      <audio ref={explosionRef} src={explosionSound} preload="auto" />
      <h2 style={{
        fontFamily: 'MedievalSharp, "Cinzel Decorative", "UnifrakturCook", "Old English Text MT", cursive',
        fontSize: '2.4rem',
        marginBottom: '1.2rem',
        letterSpacing: '1px',
        color: '#e6d28a',
        textShadow: '0 2px 8px #000, 0 0 2px #bfa980'
      }}>
        The Adventures of {custom.name}
      </h2>
      {/* Score ticker at top right under title */}
      <div style={{
        position: 'fixed',
        top: '1.5rem',
        right: '2.5rem',
        fontSize: '1.3rem',
        fontWeight: 700,
        color: '#ffe066',
        textShadow: '0 2px 8px #000, 0 0 2px #bfa980',
        letterSpacing: '1px',
        zIndex: 1000,
        background: 'rgba(24,24,24,0.85)',
        borderRadius: '8px',
        padding: '0.4rem 1.2rem',
        minWidth: '120px',
        textAlign: 'right',
        boxShadow: '0 2px 8px #0006'
      }}>
        Score: {score}
      </div>
      <svg width={map[0].length * TILE_SIZE} height={map.length * TILE_SIZE} style={{ background: '#181818', display: 'block', margin: '0 auto' }}>
        {map.map((row, y) =>
          row.map((tile, x) => {
            const event = wallEvents[`${x},${y}`];
            return (
              <g key={x + '-' + y}>
                <rect
                  x={x * TILE_SIZE}
                  y={y * TILE_SIZE}
                  width={TILE_SIZE}
                  height={TILE_SIZE}
                  fill={tile === 1 ? '#bcbcbc' : '#333'}
                  stroke="#222"
                  strokeWidth={1}
                />
                {/* Show treasures and traps */}
                {tile === 1 && event?.type === 'cheap-treasure' && (
                  <g>
                    <circle cx={x * TILE_SIZE + 16} cy={y * TILE_SIZE + 16} r={7} fill="#ffe066" stroke="#fff176" strokeWidth={2} />
                    <circle cx={x * TILE_SIZE + 22} cy={y * TILE_SIZE + 12} r={3} fill="#ff8a65" />
                    <circle cx={x * TILE_SIZE + 10} cy={y * TILE_SIZE + 22} r={2.5} fill="#64b5f6" />
                  </g>
                )}
                {tile === 1 && event?.type === 'expensive-treasure' && (
                  <g>
                    <polygon points={
                      `${x * TILE_SIZE + 16},${y * TILE_SIZE + 4} ` +
                      `${x * TILE_SIZE + 28},${y * TILE_SIZE + 16} ` +
                      `${x * TILE_SIZE + 16},${y * TILE_SIZE + 28} ` +
                      `${x * TILE_SIZE + 4},${y * TILE_SIZE + 16}`
                    } fill="#ffd700" stroke="#fffde7" strokeWidth={3} />
                    <circle cx={x * TILE_SIZE + 16} cy={y * TILE_SIZE + 16} r={6} fill="#fffde7" opacity={0.3} />
                  </g>
                )}
                {tile === 1 && event?.type === 'trap' && !deadTraps[`${x},${y}`] && (
                  <g>
                    <ellipse cx={x * TILE_SIZE + 16} cy={y * TILE_SIZE + 16} rx={9} ry={7} fill={trapHits[`${x},${y}`] ? (trapFlash[`${x},${y}`] ? '#fff' : '#a259c6') : '#a259c6'} />
                    <polygon points={
                      `${x * TILE_SIZE + 10},${y * TILE_SIZE + 10} ` +
                      `${x * TILE_SIZE + 16},${y * TILE_SIZE + 4} ` +
                      `${x * TILE_SIZE + 22},${y * TILE_SIZE + 10}`
                    } fill="#ce93d8" />
                    <polygon points={
                      `${x * TILE_SIZE + 8},${y * TILE_SIZE + 18} ` +
                      `${x * TILE_SIZE + 16},${y * TILE_SIZE + 28} ` +
                      `${x * TILE_SIZE + 24},${y * TILE_SIZE + 18}`
                    } fill="#ce93d8" />
                    {/* Optionally: visually indicate if trap is armed (first hit) */}
                    {trapHits[`${x},${y}`] && (
                      <circle cx={x * TILE_SIZE + 16} cy={y * TILE_SIZE + 16} r={12} fill="none" stroke="#fff" strokeWidth={2} strokeDasharray="4 2" />
                    )}
                  </g>
                )}
              </g>
            );
          })
        )}
        {/* Floating points above/in front of player (now much farther above head and always visible) */}
        {floatingPoints && (
          <text
            x={player.x * TILE_SIZE + 16}
            y={player.y * TILE_SIZE - 28} // much farther above the head
            fill="#4caf50"
            fontSize="18"
            fontWeight="bold"
            textAnchor="middle"
            stroke="#181818"
            strokeWidth="2"
            style={{ pointerEvents: 'none', userSelect: 'none', paintOrder: 'stroke' }}
          >
            +{floatingPoints.value}
          </text>
        )}
        <PlayerSVG x={player.x} y={player.y} {...custom} swinging={swinging} swingDir={lastDir} />
      </svg>
      <p style={{ color: '#888' }}>Use arrow keys or WASD to move your character.</p>
    </div>
  );
}
