// Rotating cube, FixedFunction (FF) version.
import './style.css';
import { vec3, mat3, mat4 } from 'gl-matrix';
import { ATTRIB, createFixedFunction, LIGHTING } from './vendor/ff/ff';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CLEAR_COLOR,
  COLORS,
  INDICES,
  PLANO_VERTICES,
  CUBO_VERTICES,
  BARRA,
  BARRA_INDICES,
  Esfera,
  Cilindro,
  generarTargets,
  NORMAL_OFFSET_BYTES,
  STRIDE_BYTES,
} from './constants';

type FF = ReturnType<typeof createFixedFunction>;

const CUBE_SPEED = 0.5; // Unidades que se mueve por segundo
const CYLINDER_SPEED = 60;
//const ROTATION_SPEED = 0.8; 
const MAX_DT = 0.1; // seconds

// Step 1. Get the WebGL2 context.
function getContext(canvas: HTMLCanvasElement): WebGL2RenderingContext {
  const gl = canvas.getContext('webgl2');
  if (!gl) throw new Error('WebGL2 is not available.');
  return gl;
}

// Step 2. Shaders and program: FF creates and owns them.
// Step 3. Vertex specification: copy the vertex and index data to the GPU.
function createVertexBuffer(gl: WebGL2RenderingContext, data: Float32Array): WebGLBuffer {
  const buffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return buffer;
}

function createIndexBuffer(gl: WebGL2RenderingContext, data: Uint16Array): WebGLBuffer {
  const buffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return buffer;
}

// Step 4. Describe how the vertex data is laid out, using FF's attribute slots.
// No ATTRIB.COLOR: lit colors come from the material.
function createVAO(gl: WebGL2RenderingContext, vertices: WebGLBuffer, indices: WebGLBuffer): WebGLVertexArrayObject {
  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
  gl.enableVertexAttribArray(ATTRIB.POSITION);
  gl.vertexAttribPointer(ATTRIB.POSITION, 3, gl.FLOAT, false, STRIDE_BYTES, 0);
  gl.enableVertexAttribArray(ATTRIB.NORMAL);
  gl.vertexAttribPointer(ATTRIB.NORMAL, 3, gl.FLOAT, false, STRIDE_BYTES, NORMAL_OFFSET_BYTES);
  // The VAO remembers the ELEMENT_ARRAY_BUFFER bound while it is bound.
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
  gl.bindVertexArray(null);
  return vao;
}

// Step 5. Pipeline state: canvas size, viewport, clear color, depth test, face culling.
function setupState(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement): void {
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(...CLEAR_COLOR);
  gl.enable(gl.DEPTH_TEST); // new vs. the triangle: nearer faces must hide farther ones
  gl.enable(gl.CULL_FACE); // skip back faces; front faces are counter-clockwise (the default)
}

// Step 6. Scene: lighting, one directional light, camera.
function setupScene(ff: FF): void {
  ff.enable(LIGHTING);
  ff.setGlobalAmbient([0.2, 0.2, 0.2, 1]); // the FF default, set explicitly to make it visible

  // The light TRAVELS in direction (-1, -1, -0.5): down, left, slightly away from the camera.
  // FF's position (w = 0) points TOWARD the light, so the sign flips: (1, 1, 0.5, 0).
  // Passing the travel direction instead lights the faces that point away from the light.
  ff.setLight(0, { position: [1, 1, 0.5, 0], diffuse: [1, 1, 1, 1] });
  ff.enableLight(0);

  const view = mat4.lookAt(mat4.create(), [0, 1.2, 3.5], [0, 0, 0], [0, 1, 0]);
  ff.setViewMatrix(view);
  // Aspect = width / height of the drawing buffer (16:9). A wrong aspect stretches the cube.
  const projection = mat4.perspective(mat4.create(), Math.PI / 4, CANVAS_WIDTH / CANVAS_HEIGHT, 0.1, 100);
  ff.setProjectionMatrix(projection);
}

// ---------------------------------------------------------------------------
// Game loop. Every frame does three separate phases:
//   1. processInput: read what the user did.
//   2. update(dt): advance the simulation by the elapsed time dt.
//   3. render: draw the current state.
// Keep the phases apart: render never changes the state, and update never calls WebGL.
// ---------------------------------------------------------------------------

// Game state: everything the simulation needs, nothing about WebGL.
//const state = { angle: 0, colorIndex: 0, rotating: true };

// Tres niveles de velocidad inicial (v0)
export const POTENCIAS = [1.8, 2.3, 2.75]; // Nivel 1 (suave), Nivel 2 (medio), Nivel 3 (fuerte)

export interface BulletState {
  active: boolean;
  position: [number, number, number];
  velocity: [number, number, number];
  radius: number;
}

export interface Particula {
  position: [number, number, number];
  velocity: [number, number, number];
  life: number;     // Tiempo de vida restante
  maxLife: number;  // Para calcular cómo se encoge
}

const state = {
  cubeX: 0,
  colorIndex: 0,
  anguloCanon: 45,
  targets: generarTargets(3),
  powerLevel: 0,
  particles: [] as Particula[],
  bullet: {
    active: false,
    position: [0, 0, 0] as [number, number, number],
    velocity: [0, 0, 0] as [number, number, number],
  } };

// Input: the keydown listener only records presses. processInput handles them later, once per frame.
//let spacePressed = false;
//let rPressed = false;

let leftPressed = false;
let rightPressed = false;
let upPressed = false;
let downPressed = false;


function setupInput(): void {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') e.preventDefault(); // stops the page from scrolling
    if (e.code === 'ArrowLeft') leftPressed = true;
    if (e.code === 'ArrowRight') rightPressed = true;
    if (e.code === 'ArrowUp') upPressed = true;
    if (e.code === 'ArrowDown') downPressed = true;
    if (e.code === 'Digit1') state.powerLevel = 0; // Potencia Suave (2.8)
    if (e.code === 'Digit2') state.powerLevel = 1; // Potencia Media (3.6)
    if (e.code === 'Digit3') state.powerLevel = 2; // Potencia Fuerte (4.5)
    if (e.code === 'KeyF') state.powerLevel = (state.powerLevel + 1) % 3;
    if (e.code === 'Space') {
      // Reconstruir la matriz del cilindro en el instante exacto del input
      const modelCilindro = mat4.create();
      mat4.translate(modelCilindro, modelCilindro, [state.cubeX, 0, 0]);
      mat4.translate(modelCilindro, modelCilindro, [0, 0.63, 2.3]);
      mat4.translate(modelCilindro, modelCilindro, [0, 0.035, 0]);

      const anguloInclinacionRad = ((90 - state.anguloCanon) * Math.PI) / 180;
      mat4.rotateX(modelCilindro, modelCilindro, -anguloInclinacionRad);

      disparar(modelCilindro, 0.4);
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft') leftPressed = false;
    if (e.code === 'ArrowRight') rightPressed = false;
    if (e.code === 'ArrowUp') upPressed = false;
    if (e.code === 'ArrowDown') downPressed = false;
  });
}

// Loop phase 1. Space selects the next color. R toggles the rotation.
// Each flag is cleared after use, so each press counts once.
//
//function processInput(): void {
  //if (spacePressed) state.colorIndex = (state.colorIndex + 1) % COLORS.length;
  //if (rPressed) state.rotating = !state.rotating;
  //spacePressed = false;
  //rPressed = false;
//}

// Loop phase 2. 
function update(dt: number): void {
  //if (state.rotating) state.angle += ROTATION_SPEED * dt; // paused: the angle keeps its value
  if (leftPressed && state.cubeX >-0.65) state.cubeX -= CUBE_SPEED * dt;
  if (rightPressed && state.cubeX < 0.65) state.cubeX += CUBE_SPEED * dt;
  if (upPressed && state.anguloCanon > 5) state.anguloCanon -= CYLINDER_SPEED * dt;
  if (downPressed && state.anguloCanon < 90) state.anguloCanon += CYLINDER_SPEED * dt;
  actualizarFisica(dt);
  actualizarParticulas(dt);
}

export function disparar(modelCilindro: mat4, alturaCilindro: number) {
  // Evitar disparar si ya hay una bala en vuelo
  if (state.bullet.active) return;

  // 1. Posición del extremo del cañón en coordenadas del mundo
  const origenLocal = vec3.fromValues(0, alturaCilindro, 0);
  const origenMundo = vec3.create();
  vec3.transformMat4(origenMundo, origenLocal, modelCilindro);

  // 2. Vector dirección hacia donde apunta el cañón
  const baseLocal = vec3.fromValues(0, 0, 0);
  const baseMundo = vec3.create();
  vec3.transformMat4(baseMundo, baseLocal, modelCilindro);

  const direccion = vec3.create();
  vec3.subtract(direccion, origenMundo, baseMundo);
  vec3.normalize(direccion, direccion);

  // 3. Multiplicar la dirección por la velocidad del nivel de potencia activo
  const v0 = POTENCIAS[state.powerLevel];
  const velocidadInicial = vec3.create();
  vec3.scale(velocidadInicial, direccion, v0);

  // 4. Activar el proyectil
  state.bullet.position = [origenMundo[0], origenMundo[1], origenMundo[2]];
  state.bullet.velocity = [velocidadInicial[0], velocidadInicial[1], velocidadInicial[2]];
  state.bullet.active = true;
}

export function crearExplosion(centro: [number, number, number]): void {
  // Generar 12 pequeños fragmentos por explosión
  for (let i = 0; i < 12; i++) {
    const vx = (Math.random() - 0.5) * 3; // Velocidad X aleatoria
    const vy = (Math.random() - 0.2) * 4; // Velocidad Y aleatoria (tendencia hacia arriba)
    const vz = (Math.random() - 0.5) * 3; // Velocidad Z aleatoria
    
    const life = 0.3 + Math.random() * 0.4; // Vivirán entre 0.3 y 0.7 segundos

    state.particles.push({
      position: [centro[0], centro[1], centro[2]],
      velocity: [vx, vy, vz],
      life: life,
      maxLife: life
    });
  }
}

export function detectarColisiones(): void {
  // Si la bala no está en vuelo, no hay nada que calcular
  if (!state.bullet.active) return;

  for (let i = 0; i < state.targets.length; i++) {
    const target = state.targets[i];
    
    // Ignorar blancos ya destruidos
    if (!target.active) continue;

    // 1. Restar los vectores de posición (dx, dy, dz)
    const dx = state.bullet.position[0] - target.position[0];
    const dy = state.bullet.position[1] - target.position[1];
    const dz = state.bullet.position[2] - target.position[2];

    // 2. Magnitud al cuadrado (Evitamos Math.sqrt)
    const distanciaCuadrada = dx * dx + dy * dy + dz * dz;

    // 3. Suma de los radios al cuadrado
    const sumaRadios = 0.015 + target.radius;
    const sumaRadiosCuadrada = sumaRadios * sumaRadios;

    // 4. Comprobar superposición
    if (distanciaCuadrada < sumaRadiosCuadrada) {
      // ¡Colisión detectada!
      target.active = false;       // Desactivar el objetivo
      state.bullet.active = false; // Ocultar/Destruir la bala
      crearExplosion([target.position[0],target.position[1],target.position[2]]);
      // Salir del bucle para que una misma bala no destruya dos objetivos a la vez
      break; 
    }
  }
}

export function actualizarParticulas(dt: number): void {
  // Iterar en reversa para poder eliminar elementos del arreglo sin romper el índice
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.life -= dt;
    
    if (p.life <= 0) {
      state.particles.splice(i, 1); // Eliminar partícula muerta
      continue;
    }

    // Aplicar gravedad y mover
    p.velocity[1] -= 4.5 * dt; 
    p.position[0] += p.velocity[0] * dt;
    p.position[1] += p.velocity[1] * dt;
    p.position[2] += p.velocity[2] * dt;
  }
}

export function actualizarFisica(deltaTime: number) {
  if (!state.bullet.active) return;

  const b = state.bullet;

  // 1. Integración de movimiento parabólico
  b.velocity[1] -= 4.5 * deltaTime; // Disminuir velocidad vertical por gravedad

  b.position[0] += b.velocity[0] * deltaTime;
  b.position[1] += b.velocity[1] * deltaTime;
  b.position[2] += b.velocity[2] * deltaTime;

  // 2. Colisión con el Piso / Base (Y <= 0.5)
  if (b.position[1] - 0.015 <= 0.5) {
    b.active = false; // Desaparece la bala al tocar el suelo
    return;
  }

  // 3. Colisión con los Targets (Distancia entre centros)
  detectarColisiones();
}

// Loop phase 3. Draw the current state. render reads the state and never changes it.
// setMaterial runs every frame, so FF re-uploads the material each frame. That costs a few
// uniforms and keeps render simple. Exercise: set the material only when colorIndex changes.
const model = mat4.create();
const normalMatrix = mat3.create();

function render(gl: WebGL2RenderingContext, ff: FF, vaoPlano: WebGLVertexArrayObject, vaoCubo: WebGLVertexArrayObject, vaoBarra: WebGLVertexArrayObject, vaoEsfera: WebGLVertexArrayObject,
  cantIndicesEsfera: number, vaoCilindro: WebGLVertexArrayObject, cantIndicesCilindro: number): void {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  // Draw plano
  mat4.identity(model);
  ff.setModelMatrix(model);
  // FF needs the normal matrix for lit normals: setModelMatrix does not update it.
  ff.setNormalMatrix(mat3.normalFromMat4(normalMatrix, model));
  ff.setMaterial({ambient: COLORS[0], diffuse: COLORS[0]})
  gl.bindVertexArray(vaoPlano);
  ff.drawElements(gl.TRIANGLES, INDICES.length, gl.UNSIGNED_SHORT, 0);
  // Draw cubo
  mat4.identity(model);
  mat4.fromTranslation(model, [state.cubeX, 0, 0]); // Matriz de traslación  
  ff.setModelMatrix(model);
  ff.setNormalMatrix(mat3.normalFromMat4(normalMatrix, model));
  ff.setMaterial({ambient: COLORS[1], diffuse: COLORS[1]})
  gl.bindVertexArray(vaoCubo);
  ff.drawElements(gl.TRIANGLES, INDICES.length, gl.UNSIGNED_SHORT, 0);
  // Draw barras
  for (let i = 0; i < 3; i++) {
    const modelBarra = mat4.create();
    // 1. Posición: X sigue al cubo, Y sube con cada iteración, Z está apenas frente a la cara (2.601)
    const yPos = 0.52 + (i * 0.03); 
    mat4.translate(modelBarra, modelBarra, [state.cubeX, yPos, 2.601]);
    // 2. Escala: El SQUARE original mide 1.2x1.2. Lo reducimos a una franja delgada y ancha.
    mat4.scale(modelBarra, modelBarra, [0.12, 0.012, 1.0]);
    ff.setModelMatrix(modelBarra);
    ff.setNormalMatrix(mat3.normalFromMat4(normalMatrix, modelBarra));
    // 3. Color: Se ilumina si el nivel de potencia actual es mayor o igual al índice de esta barra
    const color = (i <= state.powerLevel) ? COLORS[4] : COLORS[5];
    ff.setMaterial({ ambient: color, diffuse: color });
    gl.bindVertexArray(vaoBarra);
    ff.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0); // 6 es la longitud de SQUARE_INDICES
  }
  // Draw esfera
  mat4.translate(model, model, [0, 0.61, 2.5]);
  ff.setModelMatrix(model);
  ff.setNormalMatrix(mat3.normalFromMat4(normalMatrix, model));
  ff.setMaterial({ambient: [0.8, 0.8, 0.8], diffuse: COLORS[1]}); //Subimos ambiente para bajarle a las sombras
  gl.bindVertexArray(vaoEsfera);
  ff.drawElements(gl.TRIANGLES, cantIndicesEsfera, gl.UNSIGNED_SHORT, 0);
  // Draw cilindro
  const angleRad = -((90 - state.anguloCanon) * Math.PI) / 180;
  mat4.translate(model, model, [0, 0.025, 0]);
  mat4.rotateX(model, model, angleRad);
  ff.setModelMatrix(model);
  ff.setNormalMatrix(mat3.normalFromMat4(normalMatrix, model));
  ff.setMaterial({ ambient: [0.8, 0.8, 0.8], diffuse: COLORS[1] });
  gl.bindVertexArray(vaoCilindro);
  ff.drawElements(gl.TRIANGLES, cantIndicesCilindro, gl.UNSIGNED_SHORT, 0);

  // Draw bala
  const modelBala = mat4.create();

  if (state.bullet.active) {
    // Bala en vuelo: usa sus coordenadas globales absolutas
    mat4.fromTranslation(modelBala, state.bullet.position);
    mat4.scale(modelBala, modelBala, [0.4, 0.4, 0.4]);
  } else {
    // Bala acoplada: hereda la matriz del modelo actual (que viene del cilindro)
    mat4.copy(modelBala, model);
    mat4.translate(modelBala, modelBala, [0, 0.15 + 0.015, 0]);
    mat4.scale(modelBala, modelBala, [0.4, 0.4, 0.4]);
  }

  ff.setModelMatrix(modelBala);
  ff.setNormalMatrix(mat3.normalFromMat4(normalMatrix, modelBala));
  ff.setMaterial({ ambient: COLORS[3], diffuse: COLORS[3] });
  gl.bindVertexArray(vaoEsfera);
  ff.drawElements(gl.TRIANGLES, cantIndicesEsfera, gl.UNSIGNED_SHORT, 0);

  // Targets
  const modelTarget = mat4.create();
  for (const target of state.targets) {
    if (!target.active) continue;

    // Colocamos cada target en su posición absoluta del mundo
    mat4.fromTranslation(modelTarget, target.position);

    ff.setModelMatrix(modelTarget);
    ff.setNormalMatrix(mat3.normalFromMat4(normalMatrix, modelTarget));
    ff.setMaterial({ ambient: COLORS[2], diffuse: COLORS[2] });

    gl.bindVertexArray(vaoEsfera);
    ff.drawElements(gl.TRIANGLES, cantIndicesEsfera, gl.UNSIGNED_SHORT, 0);
  }
  // Explosion
  for (const p of state.particles) {
    const modelParticula = mat4.create();
    mat4.fromTranslation(modelParticula, p.position);

    // Escalar: Comienzan en 0.05 y se reducen a 0 a medida que mueren
    const scale = 0.05 * (p.life / p.maxLife);
    mat4.scale(modelParticula, modelParticula, [scale, scale, scale]);

    ff.setModelMatrix(modelParticula);
    ff.setNormalMatrix(mat3.normalFromMat4(normalMatrix, modelParticula));
    
    ff.setMaterial({ ambient: [1.0, 0.5, 0.0, 1.0], diffuse: [1.0, 0.5, 0.0, 1.0] });

    gl.bindVertexArray(vaoCubo); // Asegúrate de usar el VAO de tu cubo o esfera pequeño
    ff.drawElements(gl.TRIANGLES, INDICES.length, gl.UNSIGNED_SHORT, 0);
  }
}

function run(canvas: HTMLCanvasElement): void {
  const gl = getContext(canvas);
  const ff = createFixedFunction(gl, { debug: true });
  // VAO 1: Paralelepípedo base
  const verticesPlano = createVertexBuffer(gl, PLANO_VERTICES);
  const indicesPlano = createIndexBuffer(gl, INDICES);
  const vaoPlano = createVAO(gl, verticesPlano, indicesPlano);
  
  // VAO 2: Cubo pequeño
  const verticesCubo = createVertexBuffer(gl, CUBO_VERTICES);
  const indicesCubo = createIndexBuffer(gl, INDICES); // Reusamos los índices del plano
  const vaoCubo = createVAO(gl, verticesCubo, indicesCubo);
  
  // VAO 3: Esfera
  const dataEsfera = Esfera(0.06, 16, 16); 
  const verticesEsfera = createVertexBuffer(gl, dataEsfera.vertices);
  const indicesEsfera = createIndexBuffer(gl, dataEsfera.indices);
  const vaoEsfera = createVAO(gl, verticesEsfera, indicesEsfera);

  // VAO 4: Cilindro
  const dataCilindro = Cilindro(0.02, 0.15, 16); // Radio 0.02, largo 0.15
  const verticesCilindro = createVertexBuffer(gl, dataCilindro.vertices);
  const indicesCilindro = createIndexBuffer(gl, dataCilindro.indices);
  const vaoCilindro = createVAO(gl, verticesCilindro, indicesCilindro);

  // VAO 5: Indicadores de poder (Cuadrado/Barra)
  const verticesBarra = createVertexBuffer(gl, BARRA);
  const indicesBarra = createIndexBuffer(gl, BARRA_INDICES);
  const vaoBarra = createVAO(gl, verticesBarra, indicesBarra);

  setupState(gl, canvas);
  setupScene(ff);
  setupInput();

  //state.colorIndex = 2;
  let last: number | null = null; // set by the first frame, so dt starts at 0
  function frame(now: number): void {
    if (last === null) last = now;
    // rAF pauses in hidden tabs. On return, (now - last) would be huge, so cap dt.
    const dt = Math.min((now - last) / 1000, MAX_DT);
    last = now;
    //processInput();
    update(dt);
    render(gl, ff, vaoPlano, vaoCubo, vaoBarra, vaoEsfera, dataEsfera.cantidadIndices, vaoCilindro, dataCilindro.cantidadIndices);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Page scaffolding: create the canvas and start the cube.
const canvas = document.createElement('canvas');
document.getElementById('stage')!.append(canvas);
run(canvas);