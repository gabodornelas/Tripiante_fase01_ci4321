# Torreta arrojadora de esferas: Fase 1

By Gabriel De Ornelas from `Tripiante`

A torret standing on a floor throwing spheres at targets. The example uses the FixedFunction (FF) module, so no shader code appears in the example. The code shows the game loop that drives the animation.

## Requirements

- Node.js 18 or later (tested with Node 24)
- npm
- A browser with WebGL2 support

## Run

1. Install the dependencies. This is the only step that needs a network connection.

   ```
   npm install
   ```

2. Start the development server.

   ```
   npm run dev
   ```

3. Open `http://localhost:5173` in your browser.

## Controls

- Press `←` or `→` to move the tank across the X axis.
- Press `↑` or `↓` to adjust the angle of the cannon.
- Press `Space` to shoot the bullet.
- Press `R` to restart the game.

## Game loop

Each frame runs two steps in this order:

1. `update(dt)` changes the state of the figures according to the action that was played.
2. `render` draws the scene.

`dt` is the time since the last frame, in seconds. The value is clamped to 0.1 s. A hidden tab does not make the cube jump when the tab becomes visible again. The rotation speed is in radians per second. The cube turns at the same speed on a 60 Hz display and on a 120 Hz display.

## Other commands

| Command           | Action                                          |
| ----------------- | ----------------------------------------------- |
| `npm run build`   | Type-check with `tsc` and build to `dist/`      |
| `npm run preview` | Serve the built `dist/` folder locally          |

## Project layout

```
index.html                 page markup
src/main.ts                WebGL setup, the game loop, and the canvas
src/constants.ts           geometry, colors, interfaces, Cilindro and Esfera functions.
src/funciones.ts           relevant functions.
src/vendor/ff/             FF v1.0 (read only; do not edit)
```

## Troubleshooting

- **Blank page or "WebGL2 is not available."** Enable hardware acceleration in the browser, or try another browser.
- **Port 5173 is in use.** Stop the other process, or run `npx vite --port 3000`.
