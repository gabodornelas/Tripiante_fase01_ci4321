import './style.css';
import { mat3, mat4 } from 'gl-matrix';
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
  Particula,
  State,
  NORMAL_OFFSET_BYTES,
  STRIDE_BYTES,
} from './constants';

import {
  generarTargets,
  actualizarFisica,
  actualizarParticulas,
  disparar
} from './funciones';


type FF = ReturnType<typeof createFixedFunction>;

const CUBE_SPEED = 0.5; // Unidades que se mueve por segundo
const CYLINDER_SPEED = 60;
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
//   1. update(dt): advance the simulation by the elapsed time dt.
//   2. render: draw the current state.
// Keep the phases apart: render never changes the state, and update never calls WebGL.
// ---------------------------------------------------------------------------

// Game state: everything the simulation needs, nothing about WebGL.
const state: State = {
  cuboX: 0,
  colorIndex: 0,
  anguloCanon: 45,
  targets: generarTargets(3),
  poder: 0,
  particulas: [] as Particula[],
  bala: {
    activo: false,
    posicion: [0, 0, 0] as [number, number, number],
    velocidad: [0, 0, 0] as [number, number, number],
  },
  isRewinding: false,
  rewindProgreso: 0,
  rewindInicioX: 0,
  rewindInicioAngulo: 45,
  rewindInicioBala: [0, 0, 0],
  rewindBalaActivo: false,
  targetHistory: []
};

// Input: the keydown listener only records presses. processInput handles them later, once per frame.

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
    if (e.code === 'Digit1') state.poder = 0; // Potencia Suave (2.8)
    if (e.code === 'Digit2') state.poder = 1; // Potencia Media (3.6)
    if (e.code === 'Digit3') state.poder = 2; // Potencia Fuerte (4.5)
    if (e.code === 'KeyF') state.poder = (state.poder + 1) % 3;
    if (e.code === 'Space') {
      // Reconstruir la matriz del cilindro en el instante exacto del input
      const modelCilindro = mat4.create();
      mat4.translate(modelCilindro, modelCilindro, [state.cuboX, 0, 0]);
      mat4.translate(modelCilindro, modelCilindro, [0, 0.61, 2.5]);
      mat4.translate(modelCilindro, modelCilindro, [0, 0.025, 0]);

      const anguloInclinacionRad = ((90 - state.anguloCanon) * Math.PI) / 180;
      mat4.rotateX(modelCilindro, modelCilindro, -anguloInclinacionRad);

      disparar(modelCilindro, 0.165, state);
    }
    if (e.code === 'KeyR' && !state.isRewinding) {
      state.isRewinding = true;
      state.rewindProgreso = 0;
      
      // Reseteamos el nivel de poder a 0
      state.poder = 0;

      // Guardar estado actual
      state.rewindInicioX = state.cuboX;
      state.rewindInicioAngulo = state.anguloCanon;
      
      // Capturamos la bala en el aire
      state.rewindBalaActivo = state.bala.activo;
      if (state.bala.activo) {
        state.rewindInicioBala = [...state.bala.posicion];
        state.bala.velocidad = [0, 0, 0];
      }
      // Limpiar explosiones actuales para limpiar la pantalla
      state.particulas = []; 
    }
  });
  
  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft') leftPressed = false;
    if (e.code === 'ArrowRight') rightPressed = false;
    if (e.code === 'ArrowUp') upPressed = false;
    if (e.code === 'ArrowDown') downPressed = false;
  });
}


// Loop phase
function update(dt: number): void {
  if (state.isRewinding) {
    const REWIND_SPEED = 1.0; // Velocidad del efecto (1.0 = toma 2 segundos total)
    state.rewindProgreso += dt * REWIND_SPEED;

    // FASE 1: Devolver Tanque, Cañón y Bala (Progresión de 0.0 a 1.0)
    if (state.rewindProgreso <= 1.0) {
      const t = state.rewindProgreso;
      
      // Lerp Tanque
      state.cuboX = state.rewindInicioX + (0 - state.rewindInicioX) * t;
      
      // Lerp Cañón
      state.anguloCanon = state.rewindInicioAngulo + (45 - state.rewindInicioAngulo) * t;
      
      // Lerp Bala hacia el origen aproximado del cañón
      // SOLO devolvemos la bala lentamente si estaba volando
      if (state.rewindBalaActivo) {
        const destinoBalaX = state.cuboX;
        const destinoBalaY = 0.63 + 0.15; // Altura aproximada
        const destinoBalaZ = 2.3;
        
        state.bala.posicion[0] = state.rewindInicioBala[0] + (destinoBalaX - state.rewindInicioBala[0]) * t;
        state.bala.posicion[1] = state.rewindInicioBala[1] + (destinoBalaY - state.rewindInicioBala[1]) * t;
        state.bala.posicion[2] = state.rewindInicioBala[2] + (destinoBalaZ - state.rewindInicioBala[2]) * t;
      }
    } 
    // FASE 2: Reactivar Targets en orden inverso (Progresión de 1.0 a 2.0)
    else if (state.rewindProgreso <= 2.0) {
      state.bala.activo = false; // Ocultar bala ya acoplada
      
      // Mapear el tiempo restante (0 a 1) contra la cantidad de targets destruidos
      const targetT = state.rewindProgreso - 1.0; 
      const umbral = 1.0 / (state.targetHistory.length + 1);

      // Si el tiempo superó el umbral correspondiente a un target, lo extraemos y lo reactivamos
      if (state.targetHistory.length > 0 && targetT > umbral) {
        const targetRevivido = state.targetHistory.pop(); // Extrae el ÚLTIMO destruido (orden inverso)
        
        // Buscar este target original en el estado global para encenderlo
        const index = state.targets.findIndex(t => 
          t.posicion[0] === targetRevivido?.posicion[0] && 
          t.posicion[1] === targetRevivido?.posicion[1] &&
          t.posicion[2] === targetRevivido?.posicion[2]
        );
        
        if (index !== -1) {
          state.targets[index].activo = true;
        }
      }
    } 
    // FIN DEL REWIND
    else {
      state.isRewinding = false;
      state.rewindProgreso = 0;
      // Por seguridad, vaciamos el historial y aseguramos que el tanque esté 100% centrado
      state.targetHistory = [];
      state.cuboX = 0;
      state.anguloCanon = 45;
    }
    
    return; // Evita ejecutar las físicas normales mientras rebobina
  }

  // Comportamiento normal del juego si NO está rebobinando
  //if (state.rotating) state.angle += ROTATION_SPEED * dt; // paused: the angle keeps its value
  if (leftPressed && state.cuboX > -0.65) state.cuboX -= CUBE_SPEED * dt;
  if (rightPressed && state.cuboX < 0.65) state.cuboX += CUBE_SPEED * dt;
  if (upPressed && state.anguloCanon - CYLINDER_SPEED * dt > 5) state.anguloCanon -= CYLINDER_SPEED * dt;
  if (downPressed && state.anguloCanon + CYLINDER_SPEED * dt < 90) state.anguloCanon += CYLINDER_SPEED * dt;
  
  actualizarFisica(dt, state);
  actualizarParticulas(dt, state);
}

// Loop phase. Draw the current state. render reads the state and never changes it.
// setMaterial runs every frame, so FF re-uploads the material each frame. That costs a few
// uniforms and keeps render simple.
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
  mat4.fromTranslation(model, [state.cuboX, 0, 0]); // Matriz de traslación  
  ff.setModelMatrix(model);
  ff.setNormalMatrix(mat3.normalFromMat4(normalMatrix, model));
  ff.setMaterial({ambient: COLORS[1], diffuse: COLORS[1]})
  gl.bindVertexArray(vaoCubo);
  ff.drawElements(gl.TRIANGLES, INDICES.length, gl.UNSIGNED_SHORT, 0);
  // Draw barras
  for (let i = 0; i < 3; i++) {
    const modelBarra = mat4.create();
    // Posición: X sigue al cubo, Y sube con cada iteración, Z está apenas frente a la cara (2.601)
    const yPos = 0.52 + (i * 0.03); 
    mat4.translate(modelBarra, modelBarra, [state.cuboX, yPos, 2.601]);
    
    ff.setModelMatrix(modelBarra);
    ff.setNormalMatrix(mat3.normalFromMat4(normalMatrix, modelBarra));
    // Color: Se ilumina si el nivel de potencia actual es mayor o igual al índice de esta barra
    const color = (i <= state.poder) ? COLORS[4] : COLORS[5];
    ff.setMaterial({ ambient: color, diffuse: color });
    gl.bindVertexArray(vaoBarra);
    ff.drawElements(gl.TRIANGLES, BARRA_INDICES.length, gl.UNSIGNED_SHORT, 0);
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

  if (state.bala.activo) {
    // Bala en vuelo: usa sus coordenadas globales absolutas
    mat4.fromTranslation(modelBala, state.bala.posicion);
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
    if (!target.activo) continue;

    // Colocamos cada target en su posición absoluta del mundo
    mat4.fromTranslation(modelTarget, target.posicion);

    ff.setModelMatrix(modelTarget);
    ff.setNormalMatrix(mat3.normalFromMat4(normalMatrix, modelTarget));
    ff.setMaterial({ ambient: COLORS[2], diffuse: COLORS[2] });

    gl.bindVertexArray(vaoEsfera);
    ff.drawElements(gl.TRIANGLES, cantIndicesEsfera, gl.UNSIGNED_SHORT, 0);
  }
  // Explosion
  for (const p of state.particulas) {
    const modelParticula = mat4.create();
    mat4.fromTranslation(modelParticula, p.posicion);

    // Escalar: Comienzan en 0.15 y se reducen a 0 a medida que mueren
    const scale = 0.15 * (p.vida / p.maxVida);
    mat4.scale(modelParticula, modelParticula, [scale, scale, scale]);

    ff.setModelMatrix(modelParticula);
    ff.setNormalMatrix(mat3.normalFromMat4(normalMatrix, modelParticula));
    
    ff.setMaterial({ ambient: [1.0, 0.5, 0.0, 1.0], diffuse: [1.0, 0.5, 0.0, 1.0] });

    gl.bindVertexArray(vaoCubo); // Usamos Cubo porque parecen pedazos rotos
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