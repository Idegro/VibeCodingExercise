import React, { useEffect, useRef, useState } from 'react';
import DungeonCrawler from './DungeonCrawler';

// Types for character customization (copied from DungeonCrawler props)
type Character = {
  shirtColor: string;
  hairColor: string;
  weapon: string;
  hairStyle: string;
  name: string;
};

// Helper to extract dungeon state from DungeonCrawler
// We'll use a render prop pattern to get the map, player, and wallEvents
interface DungeonRenderProps {
  map: number[][];
  player: { x: number; y: number };
  wallEvents: { [key: string]: { type: string } };
  custom: Character;
  score: number;
}

// Raycasting constants
const FOV = Math.PI / 3; // 60 degrees
const NUM_RAYS = 120;
const MAX_DEPTH = 16;
const SCREEN_WIDTH = 640;
const SCREEN_HEIGHT = 400;
const WALL_HEIGHT = 1.0;
const TILE_SIZE = 32;

// 3D Raycaster component
export default function Raycaster3D({ character }: { character: Character }) {
  // We'll use a custom DungeonCrawler that exposes its state via a render prop
  const [dungeonState, setDungeonState] = useState<DungeonRenderProps | null>(null);
  // Camera angle (rotation), but player position is always from dungeonState
  const [angle, setAngle] = useState(Math.PI / 2); // Facing down
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // Track last movement direction from DungeonCrawler
  const [lastDir, setLastDir] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 1 }); // default facing down

  // Listen for lastDir from DungeonCrawler via wallEvents (or exposeState)
  useEffect(() => {
    if (!dungeonState) return;
    // Try to infer lastDir from player movement
    // If DungeonCrawler exposes lastDir, use it; otherwise, infer from player movement
    // We'll add a convention: if wallEvents['__lastDir'] exists, use it
    const dirEvent = dungeonState.wallEvents && dungeonState.wallEvents['__lastDir'];
    // Try to parse dx/dy from dirEvent.type if present (e.g., type: 'dir:1,0')
    if (dirEvent && typeof dirEvent.type === 'string' && dirEvent.type.startsWith('dir:')) {
      const parts = dirEvent.type.substring(4).split(',');
      const dx = parseInt(parts[0], 10);
      const dy = parseInt(parts[1], 10);
      if (!isNaN(dx) && !isNaN(dy)) {
        setLastDir({ dx, dy });
      }
    }
  }, [dungeonState?.wallEvents]);

  // Set camera angle to match lastDir
  useEffect(() => {
    // dx/dy to angle: (1,0)=E, (0,1)=S, (-1,0)=W, (0,-1)=N
    let newAngle = angle;
    if (lastDir.dx === 1 && lastDir.dy === 0) newAngle = 0;
    else if (lastDir.dx === 0 && lastDir.dy === 1) newAngle = Math.PI / 2;
    else if (lastDir.dx === -1 && lastDir.dy === 0) newAngle = Math.PI;
    else if (lastDir.dx === 0 && lastDir.dy === -1) newAngle = 3 * Math.PI / 2;
    setAngle(newAngle);
  }, [lastDir]);

  // Compass directions for 90-degree angles
  function getCompass(angle: number) {
    // 0 = right (east), PI/2 = down (south), PI = left (west), 3PI/2 = up (north)
    const norm = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    if (Math.abs(norm - 0) < 0.01) return 'E';
    if (Math.abs(norm - Math.PI / 2) < 0.01) return 'S';
    if (Math.abs(norm - Math.PI) < 0.01) return 'W';
    if (Math.abs(norm - 3 * Math.PI / 2) < 0.01) return 'N';
    return '';
  }

  // Raycasting render
  useEffect(() => {
    if (!dungeonState) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    const map = dungeonState.map;
    const wallEvents = dungeonState.wallEvents || {};
    // Use player position from dungeonState
    const player = dungeonState.player;
    const pos = { x: player.x + 0.5, y: player.y + 0.5 };
    // Draw floor
    ctx.fillStyle = '#222';
    ctx.fillRect(0, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT / 2);
    // Draw ceiling
    ctx.fillStyle = '#888';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT / 2);
    // Draw walls (brown, with distance-based shading)
    for (let i = 0; i < NUM_RAYS; i++) {
      const rayAngle = angle - FOV / 2 + (i / NUM_RAYS) * FOV;
      let dist = 0;
      let hit = false;
      let hitX = 0, hitY = 0;
      while (!hit && dist < MAX_DEPTH) {
        dist += 0.03;
        const testX = pos.x + Math.cos(rayAngle) * dist;
        const testY = pos.y + Math.sin(rayAngle) * dist;
        if (
          testY < 0 || testY >= map.length ||
          testX < 0 || testX >= map[0].length ||
          map[Math.floor(testY)][Math.floor(testX)] === 0
        ) {
          hit = true;
          hitX = Math.floor(testX);
          hitY = Math.floor(testY);
        }
      }
      if (dist < MAX_DEPTH) {
        // Default wall color: brown, darker with distance
        let baseR = 141, baseG = 85, baseB = 36;
        // Distance shading: fade to black
        const shade = Math.max(0, 1 - dist / MAX_DEPTH);
        const r = Math.round(baseR * shade);
        const g = Math.round(baseG * shade);
        const b = Math.round(baseB * shade);
        const wallHeight = Math.min(
          (WALL_HEIGHT / (dist * Math.cos(rayAngle - angle))) * SCREEN_HEIGHT,
          SCREEN_HEIGHT
        );
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(i * (SCREEN_WIDTH / NUM_RAYS), (SCREEN_HEIGHT - wallHeight) / 2, SCREEN_WIDTH / NUM_RAYS + 1, wallHeight);
      }
      // --- FIX: Render sprite for event behind wall (correct tile, correct bounds) ---
      let behindDist = dist + 0.05;
      const behindXf = pos.x + Math.cos(rayAngle) * behindDist;
      const behindYf = pos.y + Math.sin(rayAngle) * behindDist;
      const behindX = Math.floor(behindXf);
      const behindY = Math.floor(behindYf);
      if (
        behindX >= 0 && behindX < map[0].length &&
        behindY >= 0 && behindY < map.length &&
        map[hitY][hitX] === 0 && // Only if wall is still present
        map[behindY][behindX] === 1 // Only if tile behind is floor
      ) {
        const eventKey = `${behindX},${behindY}`;
        const event = wallEvents[eventKey];
        if (event && event.type && event.type !== 'none') {
          // Project the tile behind the wall to the screen
          const eventDist = Math.sqrt((behindX + 0.5 - pos.x) ** 2 + (behindY + 0.5 - pos.y) ** 2);
          const spriteHeight = Math.min(
            (WALL_HEIGHT / (eventDist * Math.cos(rayAngle - angle))) * SCREEN_HEIGHT / 2,
            SCREEN_HEIGHT / 2
          );
          const spriteWidth = (SCREEN_WIDTH / NUM_RAYS) / 2;
          const x = i * (SCREEN_WIDTH / NUM_RAYS) + (SCREEN_WIDTH / NUM_RAYS - spriteWidth) / 2;
          const y = (SCREEN_HEIGHT - spriteHeight) / 2 + SCREEN_HEIGHT / 4;
          ctx.save();
          if (event.type === 'cheap-treasure') {
            ctx.fillStyle = '#ffe066';
            ctx.beginPath();
            ctx.arc(x + spriteWidth / 2, y + spriteHeight / 2, Math.min(spriteWidth, spriteHeight) / 3, 0, 2 * Math.PI);
            ctx.globalAlpha = 0.85;
            ctx.fill();
            ctx.globalAlpha = 1.0;
            ctx.strokeStyle = '#bfa980';
            ctx.lineWidth = 1.2;
            ctx.stroke();
          } else if (event.type === 'expensive-treasure') {
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.moveTo(x + spriteWidth / 2, y + spriteHeight / 4);
            ctx.lineTo(x + spriteWidth * 0.8, y + spriteHeight / 2);
            ctx.lineTo(x + spriteWidth / 2, y + spriteHeight * 0.75);
            ctx.lineTo(x + spriteWidth * 0.2, y + spriteHeight / 2);
            ctx.closePath();
            ctx.globalAlpha = 0.85;
            ctx.fill();
            ctx.globalAlpha = 1.0;
            ctx.strokeStyle = '#fffde7';
            ctx.lineWidth = 1.2;
            ctx.stroke();
          } else if (event.type === 'trap') {
            ctx.fillStyle = '#a259c6';
            ctx.beginPath();
            ctx.moveTo(x + spriteWidth / 2, y + spriteHeight / 4);
            ctx.lineTo(x + spriteWidth * 0.8, y + spriteHeight * 0.75);
            ctx.lineTo(x + spriteWidth * 0.2, y + spriteHeight * 0.75);
            ctx.closePath();
            ctx.globalAlpha = 0.85;
            ctx.fill();
            ctx.globalAlpha = 1.0;
            ctx.strokeStyle = '#ce93d8';
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
          ctx.restore();
        }
      }
      // Draw event overlays for treasures/traps as wall-like slices (half height, half width, centered)
      // Find the first floor tile after the wall
      let floorDist = dist;
      let foundFloor = false;
      let floorX = hitX, floorY = hitY;
      while (!foundFloor && floorDist < MAX_DEPTH) {
        floorDist += 0.03;
        const testX = pos.x + Math.cos(rayAngle) * floorDist;
        const testY = pos.y + Math.sin(rayAngle) * floorDist;
        if (
          testY < 0 || testY >= map.length ||
          testX < 0 || testX >= map[0].length
        ) {
          break;
        }
        if (map[Math.floor(testY)][Math.floor(testX)] === 1) {
          foundFloor = true;
          floorX = Math.floor(testX);
          floorY = Math.floor(testY);
        }
      }
      if (foundFloor) {
        const wallKey = `${floorX},${floorY}`;
        const event = wallEvents[wallKey];
        if (event && event.type && event.type !== 'none') {
          // Project the floor tile to the screen as a wall-like slice (half height, half width, centered)
          // Calculate distance from player to this tile
          const eventDist = Math.sqrt((floorX + 0.5 - pos.x) ** 2 + (floorY + 0.5 - pos.y) ** 2);
          const sliceHeight = Math.min(
            (WALL_HEIGHT / (eventDist * Math.cos(rayAngle - angle))) * SCREEN_HEIGHT / 2,
            SCREEN_HEIGHT / 2
          );
          const sliceWidth = (SCREEN_WIDTH / NUM_RAYS) / 2;
          const x = i * (SCREEN_WIDTH / NUM_RAYS) + (SCREEN_WIDTH / NUM_RAYS - sliceWidth) / 2;
          const y = (SCREEN_HEIGHT - sliceHeight) / 2 + SCREEN_HEIGHT / 4;
          ctx.save();
          if (event.type === 'cheap-treasure') {
            ctx.fillStyle = '#ffe066';
            ctx.fillRect(x, y, sliceWidth, sliceHeight);
            // Draw coin icon overlay
            ctx.beginPath();
            ctx.arc(x + sliceWidth / 2, y + sliceHeight / 2, Math.min(sliceWidth, sliceHeight) / 3, 0, 2 * Math.PI);
            ctx.fillStyle = '#fff176';
            ctx.globalAlpha = 0.7;
            ctx.fill();
            ctx.globalAlpha = 1.0;
          } else if (event.type === 'expensive-treasure') {
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(x, y, sliceWidth, sliceHeight);
            // Draw gem icon overlay
            ctx.beginPath();
            ctx.moveTo(x + sliceWidth / 2, y + sliceHeight / 4);
            ctx.lineTo(x + sliceWidth * 0.8, y + sliceHeight / 2);
            ctx.lineTo(x + sliceWidth / 2, y + sliceHeight * 0.75);
            ctx.lineTo(x + sliceWidth * 0.2, y + sliceHeight / 2);
            ctx.closePath();
            ctx.fillStyle = '#fffde7';
            ctx.globalAlpha = 0.7;
            ctx.fill();
            ctx.globalAlpha = 1.0;
          } else if (event.type === 'trap') {
            ctx.fillStyle = '#a259c6';
            ctx.fillRect(x, y, sliceWidth, sliceHeight);
            // Draw trap icon overlay (triangle)
            ctx.beginPath();
            ctx.moveTo(x + sliceWidth / 2, y + sliceHeight / 4);
            ctx.lineTo(x + sliceWidth * 0.8, y + sliceHeight * 0.75);
            ctx.lineTo(x + sliceWidth * 0.2, y + sliceHeight * 0.75);
            ctx.closePath();
            ctx.fillStyle = '#ce93d8';
            ctx.globalAlpha = 0.7;
            ctx.fill();
            ctx.globalAlpha = 1.0;
          }
          ctx.restore();
        }
      }
    }
  }, [dungeonState, angle]);

  // Force update on keydown and window focus to ensure 3D view is always in sync
  useEffect(() => {
    function forceUpdate() {
      setDungeonState((prev) => ({ ...prev } as DungeonRenderProps));
    }
    window.addEventListener('keydown', forceUpdate);
    window.addEventListener('focus', forceUpdate);
    return () => {
      window.removeEventListener('keydown', forceUpdate);
      window.removeEventListener('focus', forceUpdate);
    };
  }, []);

  // Remove remapping of movement keys to camera-relative directions
  // Restore previous movement handler: WASD/arrow keys are passed directly to DungeonCrawler
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      // Only handle camera angle (left/right) here
      let newAngle = angle;
      let turned = false;
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        newAngle -= Math.PI / 2;
        turned = true;
      }
      if (e.key === 'ArrowRight' || e.key === 'd') {
        newAngle += Math.PI / 2;
        turned = true;
      }
      // Normalize angle to [0, 2PI)
      newAngle = ((newAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      if (turned) setAngle(newAngle);
      // Do NOT handle movement or wall breaking here; let DungeonCrawler handle all keys
    }
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [angle]);

  // Render prop DungeonCrawler: we need to get the map, player, and wallEvents
  // We'll use a hack: render DungeonCrawler offscreen and extract state via a callback
  // (In a real app, refactor DungeonCrawler to support this pattern)
  // --- Minimap rendering ---
  function renderMinimap() {
    if (!dungeonState) return null;
    const map = dungeonState.map;
    const player = dungeonState.player;
    const wallEvents = dungeonState.wallEvents || {};
    const cellSize = 8;
    return (
      <svg width={map[0].length * cellSize} height={map.length * cellSize} style={{ background: '#222', borderRadius: 6, boxShadow: '0 1px 6px #0006', marginLeft: 24 }}>
        {map.map((row, y) =>
          row.map((tile, x) => {
            // Draw base tile
            let fill = tile === 1 ? '#bcbcbc' : '#333';
            let event = wallEvents[`${x},${y}`];
            // Overlay event color
            if (event && event.type && event.type !== 'none') {
              if (event.type === 'cheap-treasure') fill = '#ffe066';
              else if (event.type === 'expensive-treasure') fill = '#ffd700';
              else if (event.type === 'trap') fill = '#a259c6';
            }
            return (
              <rect
                key={x + '-' + y}
                x={x * cellSize}
                y={y * cellSize}
                width={cellSize}
                height={cellSize}
                fill={fill}
                stroke="#181818"
                strokeWidth={0.5}
              />
            );
          })
        )}
        {/* Draw event icons on top */}
        {Object.entries(wallEvents).map(([key, event]) => {
          if (!event || !event.type || event.type === 'none') return null;
          const [x, y] = key.split(',').map(Number);
          if (x < 0 || y < 0 || x >= map[0].length || y >= map.length) return null;
          const cx = x * cellSize + cellSize / 2;
          const cy = y * cellSize + cellSize / 2;
          if (event.type === 'cheap-treasure') {
            return (
              <circle key={key} cx={cx} cy={cy} r={cellSize * 0.25} fill="#fff176" stroke="#bfa980" strokeWidth={0.8} />
            );
          } else if (event.type === 'expensive-treasure') {
            return (
              <polygon key={key} points={
                `${cx},${cy - cellSize * 0.22} ` +
                `${cx + cellSize * 0.18},${cy} ` +
                `${cx},${cy + cellSize * 0.22} ` +
                `${cx - cellSize * 0.18},${cy}`
              } fill="#fffde7" stroke="#ffd700" strokeWidth={0.8} />
            );
          } else if (event.type === 'trap') {
            return (
              <polygon key={key} points={
                `${cx},${cy - cellSize * 0.18} ` +
                `${cx + cellSize * 0.18},${cy + cellSize * 0.18} ` +
                `${cx - cellSize * 0.18},${cy + cellSize * 0.18}`
              } fill="#ce93d8" stroke="#a259c6" strokeWidth={0.8} />
            );
          }
          return null;
        })}
        {/* Player position */}
        <circle
          cx={player.x * cellSize + cellSize / 2}
          cy={player.y * cellSize + cellSize / 2}
          r={cellSize * 0.4}
          fill="#ffe066"
          stroke="#bfa980"
          strokeWidth={1}
        />
      </svg>
    );
  }

  return (
    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
      {/* Compass above the game screen */}
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '0.5rem',
        fontFamily: 'MedievalSharp, "Cinzel Decorative", "UnifrakturCook", "Old English Text MT", cursive',
        fontSize: '1.5rem', color: '#e6d28a', letterSpacing: '2px', textShadow: '0 2px 8px #000, 0 0 2px #bfa980'
      }}>
        <span style={{ marginRight: 16, opacity: 0.5 }}>N</span>
        <span style={{ marginRight: 16, opacity: 0.5 }}>W</span>
        <span style={{ fontWeight: 700, fontSize: '2.1rem', color: '#ffe066', textShadow: '0 2px 8px #000, 0 0 2px #bfa980' }}>{getCompass(angle)}</span>
        <span style={{ marginLeft: 16, opacity: 0.5 }}>E</span>
        <span style={{ marginLeft: 16, opacity: 0.5 }}>S</span>
      </div>
      <h2 style={{
        fontFamily: 'MedievalSharp, "Cinzel Decorative", "UnifrakturCook", "Old English Text MT", cursive',
        fontSize: '2.4rem',
        marginBottom: '1.2rem',
        letterSpacing: '1px',
        color: '#e6d28a',
        textShadow: '0 2px 8px #000, 0 0 2px #bfa980'
      }}>
        The Adventures of {character.name} (3D)
      </h2>
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: 32 }}>
        <canvas ref={canvasRef} width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={{ borderRadius: 12, background: '#111', boxShadow: '0 2px 16px #0008' }} />
        {renderMinimap()}
      </div>
      {/* Hidden DungeonCrawler for state extraction */}
      <div style={{ display: 'none' }}>
        <DungeonCrawler
          character={character}
          // @ts-ignore
          exposeState={setDungeonState}
        />
      </div>
      <div style={{ color: '#888', marginTop: '1.5rem' }}>
        Use WASD or arrow keys to move and turn.<br />
        (This is a simple 3D raycaster demo. All game logic is shared with the 2D version.)
      </div>
    </div>
  );
}
