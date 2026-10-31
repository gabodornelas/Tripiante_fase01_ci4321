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
  -1.5, 0,   3,   0,  1,  0,
   1.5, 0,   3,   0,  1,  0,
   1.5, 0.5, 0,   0,  1,  0,
  -1.5, 0.5, 0,   0,  1,  0,
  // -Y face (bottom)
  -1.5, 0,   0,   0, -1,  0,
   1.5, 0,   0,   0, -1,  0,
   1.5, 0.5, 3,   0, -1,  0,
  -1.5, 0.5, 3,   0, -1,  0,
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
  //  x      y     z     nx  ny  nz
  -0.6,   0.6,  0.0,    0,  0,  1,  // Arriba izq
  -0.3,  -0.6,  0.0,    0,  0,  1,  // Abajo izq
   0.6,  -0.6,  0.0,    0,  0,  1,  // Abajo der
   0.3,   0.6,  0.0,    0,  0,  1,  // Arriba der
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
      indices.push(primero, segundo, primero + 1);
      indices.push(segundo, segundo + 1, primero + 1);
    }
  }
  const centroBaseIndex = vertices.length / 6;
  // Vértice central del disco base (apuntando la normal hacia abajo: ny = -1)
  vertices.push(0, 0, 0, 0, -1, 0);

  const baseInicioIndex = centroBaseIndex + 1;
  for (let lon = 0; lon <= longitudes; lon++) {
    const phi = (lon * 2 * Math.PI) / longitudes;
    const x = radio * Math.cos(phi);
    const z = radio * Math.sin(phi);
    // Vértices del borde del disco
    vertices.push(x, 0, z, 0, -1, 0);
  }

  // Triángulos del disco base
  for (let lon = 0; lon < longitudes; lon++) {
    indices.push(
      centroBaseIndex,
      baseInicioIndex + lon + 1,
      baseInicioIndex + lon
    );
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

    indices.push(vBase1, vBase2, vTope1);
    indices.push(vTope1, vBase2, vTope2);
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
    indices.push(centroTopeIdx, inicioTopeIdx + i, inicioTopeIdx + i + 1);
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
    indices.push(centroBaseIdx, inicioBaseIdx + i + 1, inicioBaseIdx + i);
  }

  return {
    vertices: new Float32Array(vertices),
    indices: new Uint16Array(indices),
    cantidadIndices: indices.length,
  };
}

export interface Target {
  position: [number, number, number];
  active: boolean;
  radius: number;
}

export interface Target {
  position: [number, number, number];
  active: boolean;
  radius: number;
}

export interface Target {
  position: [number, number, number];
  active: boolean;
  radius: number;
}

export function generarTargets(cantidad: number): Target[] {
  const targets: Target[] = [];

  const z0 = 2.15; 
  const y0 = 0.65; 
  const g = 4.5;
  const potencias = [1.8, 2.3, 2.75];

  const stepAngulo = (80 - 15) / cantidad; 
  const franjasAngulo = Array.from({ length: cantidad }, (_, i) => i);
  const franjasT = Array.from({ length: cantidad }, (_, i) => i);

  // Fisher-Yates
  for (let i = cantidad - 1; i > 0; i--) {
    const jA = Math.floor(Math.random() * (i + 1));
    [franjasAngulo[i], franjasAngulo[jA]] = [franjasAngulo[jA], franjasAngulo[i]];

    const jT = Math.floor(Math.random() * (i + 1));
    [franjasT[i], franjasT[jT]] = [franjasT[jT], franjasT[i]];
  }

  for (let i = 0; i < cantidad; i++) {
    const v0 = potencias[Math.floor(Math.random() * potencias.length)];
    
    let angulo = 15 + franjasAngulo[i] * stepAngulo + Math.random() * (stepAngulo * 0.75);
    let anguloRad = (angulo * Math.PI) / 180;

    // SALVAGUARDA 1: Evitar que el pico de la parábola supere Y = 1.25 (Techo)
    const maxV0y = 2.323; // sqrt(2 * g * (1.25 - y0))
    if (v0 * Math.sin(anguloRad) > maxV0y) {
      anguloRad = Math.asin(maxV0y / v0); 
    }

    const v0y = v0 * Math.sin(anguloRad);
    const v0x = v0 * Math.cos(anguloRad);

    // SALVAGUARDA 2: Evitar que se vaya más atrás de Z = 0.30 y que atraviese el piso
    const tMaxZ = (z0 - 0.30) / v0x; 
    const tMaxY = (v0y + Math.sqrt(v0y * v0y + 2 * g * (y0 - 0.60))) / g; 
    
    // El tiempo máximo permitido es el límite que cruce primero (Z lejano o Suelo)
    const tMax = Math.min(tMaxZ, tMaxY); 

    // Aplicar Fisher-Yates dentro del tiempo de vuelo VÁLIDO de esta trayectoria
    const tStep = (tMax - 0.2) / cantidad;
    const t = 0.2 + franjasT[i] * tStep + Math.random() * (tStep * 0.75);

    const z = z0 - v0x * t;
    const y = y0 + v0y * t - 0.5 * g * t * t;
    const x = -0.75 + Math.random() * 1.5; 

    targets.push({
      position: [x, y, z],
      active: true,
      radius: 0.1
    });
  }

  return targets;
}