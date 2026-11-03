// Scene constants: geometry, colors and canvas settings. main.ts holds the WebGL code and the game loop.

/** Background color #506ff9 as linear floats in [0, 1]. */
export const CLEAR_COLOR: readonly [number, number, number, number] = [0x50 / 255, 0x6f / 255, 0xf9 / 255, 1];

/** Drawing buffer size in pixels, 16:9. CSS scales the canvas to fit the window; the buffer stays fixed. */
export const CANVAS_WIDTH = window.innerWidth;
export const CANVAS_HEIGHT = window.innerWidth * (9/16);

/** Colors, RGBA. Space cycles through them in this order. */
export const COLORS: readonly (readonly [number, number, number, number])[] = [
  [0.36, 0.24, 0.14, 1], // Marrón
  [0.3, 0.3, 0.3, 1],    // gris oscuro
  [1, 0.27, 0, 1],       // anaranjado rojizo
  [0, 0, 0, 1],          // Negro puro
  [0.1, 1.0, 0.1, 1],    // Verde claro
  [0.0, 0.6, 0.1, 1],    // Verde oscuro
];

// 24 vertices (4 per face), not 8 corners. A corner is shared by 3 faces, but a vertex holds
// only one normal. Each face needs its own normal for flat lighting, so each face gets its own 4 vertices.
/** Interleaved vertex data: x, y, z, nx, ny, nz per vertex. counter-clockwise seen from outside. */
export const PLANO_VERTICES = new Float32Array([
  //   x      y      z    nx  ny  nz
  // +Z face (front)
  -1.5,  0,  3,   0,  0,  1, // bottom left
   1.5,  0,  3,   0,  0,  1, // bottom right
   1.5, 0.5,  3,   0,  0,  1, // top right
  -1.5, 0.5,  3,   0,  0,  1, // top left
  // -Z face (back)
   1.5, 0,   0,   0,  0, -1,
  -1.5, 0,   0,   0,  0, -1,
  -1.5, 0.5, 0,   0,  0, -1,
   1.5, 0.5, 0,   0,  0, -1,
  // +X face (right)
   1.5, 0,    3,   1,  0,  0,
   1.5, 0,   0,   1,  0,  0,
   1.5, 0.5, 0,   1,  0,  0,
   1.5, 0.5,  3,   1,  0,  0,
  // -X face (left)
  -1.5, 0,   0,  -1,  0,  0,
  -1.5, 0,   3,  -1,  0,  0,
  -1.5, 0.5, 3,  -1,  0,  0,
  -1.5, 0.5, 0,  -1,  0,  0,
  // +Y face (top)
  -1.5, 0.5,   3,   0,  1,  0,
   1.5, 0.5,   3,   0,  1,  0,
   1.5, 0.5,   0,   0,  1,  0,
  -1.5, 0.5,   0,   0,  1,  0,
  // -Y face (bottom)
  -1.5, 0,   0,   0, -1,  0,
   1.5, 0,   0,   0, -1,  0,
   1.5, 0,   3,   0, -1,  0,
  -1.5, 0,   3,   0, -1,  0,
]);

/** Two triangles per face, 36 indices. Each face: (0, 1, 2) and (0, 2, 3), both counter-clockwise. */
export const INDICES = new Uint16Array([
   0,  1,  2,   0,  2,  3, // +Z
   4,  5,  6,   4,  6,  7, // -Z
   8,  9, 10,   8, 10, 11, // +X
  12, 13, 14,  12, 14, 15, // -X
  16, 17, 18,  16, 18, 19, // +Y
  20, 21, 22,  20, 22, 23, // -Y
]);

export const STRIDE_BYTES = 6 * 4; // 4 bytes per float (Float32)
export const NORMAL_OFFSET_BYTES = 3 * 4;

// Cubo posicionado encima del paralelepípedo base
export const CUBO_VERTICES = new Float32Array([
  //   x      y      z    nx  ny  nz
  // +Z face (front)
  -0.1,  0.5,  2.6,    0,  0,  1, // bottom left
   0.1,  0.5,  2.6,    0,  0,  1, // bottom right
   0.1,  0.6, 2.6,    0,  0,  1, // top right
  -0.1,  0.6, 2.6,    0,  0,  1, // top left
  
  // -Z face (back)
   0.1,  0.5,  2.4,    0,  0, -1,
  -0.1,  0.5,  2.4,    0,  0, -1,
  -0.1,  0.6,  2.4,    0,  0, -1,
   0.1,  0.6,  2.4,    0,  0, -1,
  
  // +X face (right)
   0.1,  0.5,  2.6,    1,  0,  0,
   0.1,  0.5,  2.4,    1,  0,  0,
   0.1,  0.6, 2.4,    1,  0,  0,
   0.1,  0.6, 2.6,    1,  0,  0,
  
  // -X face (left)
  -0.1,  0.5,  2.4,   -1,  0,  0,
  -0.1,  0.5,  2.6,   -1,  0,  0,
  -0.1,  0.6, 2.6,   -1,  0,  0,
  -0.1,  0.6, 2.4,   -1,  0,  0,
  
  // +Y face (top)
  -0.1,  0.6,  2.6,    0,  1,  0,
   0.1,  0.6,  2.6,    0,  1,  0,
   0.1,  0.6,  2.4,    0,  1,  0,
  -0.1,  0.6,  2.4,    0,  1,  0,
  
  // -Y face (bottom)
  -0.1,  0.5,  2.4,    0, -1,  0,
   0.1,  0.5,  2.4,    0, -1,  0,
   0.1,  0.5,  2.6,    0, -1,  0,
  -0.1,  0.5,  2.6,    0, -1,  0,
]);

// Barras de poder
export const BARRA = new Float32Array([
  //     x         y       z     nx  ny  nz
  -0.072,  0.0072,  0.0,    0,  0,  1,  // Arriba izq
  -0.036, -0.0072,  0.0,    0,  0,  1,  // Abajo izq
   0.072, -0.0072,  0.0,    0,  0,  1,  // Abajo der
   0.036,  0.0072,  0.0,    0,  0,  1,  // Arriba der
]);

export const BARRA_INDICES = new Uint16Array([
  0, 1, 2, // Triángulo inf izq
  0, 2, 3  // Triángulo sup der
]);

export function Esfera(radio: number, latitudes: number, longitudes: number) {
  // Límites 
  if (latitudes > 64) latitudes = 64;
  if (latitudes < 3) latitudes = 3;
  if (longitudes > 64) longitudes = 64;
  if (longitudes < 3) longitudes = 3;

  const vertices = [];
  const indices = [];

  // Calcular vértices y normales
  for (let lat = 0; lat <= latitudes; lat++) {
    // Para media esfera, el ángulo va de 0 a PI
    const theta = (lat * Math.PI) / latitudes; 
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let lon = 0; lon <= longitudes; lon++) {
      // El ángulo horizontal va de 0 a 2*PI (giro completo)
      const phi = (lon * 2 * Math.PI) / longitudes;
      
      // Coordenadas normalizadas (esto sirve como la normal para la luz)
      const nx = Math.cos(phi) * sinTheta;
      const ny = cosTheta;
      const nz = Math.sin(phi) * sinTheta;

      // Posición final (multiplicando por el radio)
      const x = radio * nx;
      const y = radio * ny;
      const z = radio * nz;

      vertices.push(x, y, z, nx, ny, nz);
    }
  }
  // Crear los triángulos conectando los puntos
  for (let lat = 0; lat < latitudes; lat++) {
    for (let lon = 0; lon < longitudes; lon++) {
      const primero = (lat * (longitudes + 1)) + lon;
      const segundo = primero + longitudes + 1;

      // Sentido antihorario para los dos triángulos de cada "pixel"
      indices.push(primero, primero + 1, segundo);
      indices.push(segundo, primero + 1, segundo + 1);
    }
  }
  return {
    vertices: new Float32Array(vertices), 
    indices: new Uint16Array(indices), 
    cantidadIndices: indices.length
  };
}

export function Cilindro(radio: number, altura: number, segmentos: number = 16) {
  if (segmentos < 3) segmentos = 3;

  const vertices: number[] = [];
  const indices: number[] = [];

  // 1. Cuerpo lateral (normales horizontales hacia afuera)
  for (let i = 0; i <= segmentos; i++) {
    const phi = (i * 2 * Math.PI) / segmentos;
    const nx = Math.cos(phi);
    const nz = Math.sin(phi);
    const x = radio * nx;
    const z = radio * nz;

    // Vértice base (Y = 0)
    vertices.push(x, 0, z, nx, 0, nz);
    // Vértice punta (Y = altura)
    vertices.push(x, altura, z, nx, 0, nz);
  }

  // Índices del cuerpo lateral (Winding Order CCW)
  for (let i = 0; i < segmentos; i++) {
    const vBase1 = i * 2;
    const vTope1 = i * 2 + 1;
    const vBase2 = (i + 1) * 2;
    const vTope2 = (i + 1) * 2 + 1;

    indices.push(vBase1, vTope1, vBase2);
    indices.push(vTope1, vTope2, vBase2);
  }

  // 2. Tapa superior (Y = altura, normal = [0, 1, 0])
  const centroTopeIdx = vertices.length / 6;
  vertices.push(0, altura, 0, 0, 1, 0);

  const inicioTopeIdx = centroTopeIdx + 1;
  for (let i = 0; i <= segmentos; i++) {
    const phi = (i * 2 * Math.PI) / segmentos;
    vertices.push(radio * Math.cos(phi), altura, radio * Math.sin(phi), 0, 1, 0);
  }

  for (let i = 0; i < segmentos; i++) {
    indices.push(centroTopeIdx, inicioTopeIdx + i + 1, inicioTopeIdx + i);
  }

  // 3. Tapa inferior (Y = 0, normal = [0, -1, 0])
  const centroBaseIdx = vertices.length / 6;
  vertices.push(0, 0, 0, 0, -1, 0);

  const inicioBaseIdx = centroBaseIdx + 1;
  for (let i = 0; i <= segmentos; i++) {
    const phi = (i * 2 * Math.PI) / segmentos;
    vertices.push(radio * Math.cos(phi), 0, radio * Math.sin(phi), 0, -1, 0);
  }

  for (let i = 0; i < segmentos; i++) {
    indices.push(centroBaseIdx, inicioBaseIdx + i, inicioBaseIdx + i + 1);
  }

  return {
    vertices: new Float32Array(vertices),
    indices: new Uint16Array(indices),
    cantidadIndices: indices.length,
  };
}

export interface Target {
  posicion: [number, number, number];
  activo: boolean;
  radio: number;
}

export interface EstadoBala {
  activo: boolean;
  posicion: [number, number, number];
  velocidad: [number, number, number];
}

export interface Particula {
  posicion: [number, number, number];
  velocidad: [number, number, number];
  vida: number;
  maxVida: number;
}

export interface State {
  cuboX: number;
  colorIndex: number;
  anguloCanon: number;
  targets: Target[];
  poder: number;
  particulas: Particula[];
  bala: EstadoBala;
  
  // Nuevas variables para el Rewind
  isRewinding: boolean;
  rewindProgreso: number;
  rewindInicioX: number;
  rewindInicioAngulo: number;
  rewindInicioBala: [number, number, number];
  rewindBalaActivo: boolean;
  targetHistory: Target[];
}