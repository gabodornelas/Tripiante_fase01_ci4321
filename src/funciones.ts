import {Target, State} from './constants'
import { vec3, mat4 } from 'gl-matrix';

// Tres niveles de velocidad inicial (v0)
export const POTENCIAS = [1.8, 2.3, 2.75]; // Nivel 1 (suave), Nivel 2 (medio), Nivel 3 (fuerte)


export function disparar(modelCilindro: mat4, alturaCilindro: number, state: State) {
  // Evitar disparar si ya hay una bala en vuelo
  if (state.bala.activo) return;

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
  const v0 = POTENCIAS[state.poder];
  const velocidadInicial = vec3.create();
  vec3.scale(velocidadInicial, direccion, v0);

  // 4. Activar el proyectil
  state.bala.posicion = [origenMundo[0], origenMundo[1], origenMundo[2]];
  state.bala.velocidad = [velocidadInicial[0], velocidadInicial[1], velocidadInicial[2]];
  state.bala.activo = true;
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
      posicion: [x, y, z],
      activo: true,
      radio: 0.1
    });
  }

  return targets;
}

export function actualizarFisica(deltaTime: number, state: State) {
  if (!state.bala.activo) return;

  const b = state.bala;

  // 1. Integración de movimiento parabólico
  b.velocidad[1] -= 4.5 * deltaTime; // Disminuir velocidad vertical por gravedad

  b.posicion[0] += b.velocidad[0] * deltaTime;
  b.posicion[1] += b.velocidad[1] * deltaTime;
  b.posicion[2] += b.velocidad[2] * deltaTime;

  // 2. Colisión con el Piso / Base (Y <= 0.5)
  if (b.posicion[1] - 0.015 <= 0.5) {
    b.activo = false; // Desaparece la bala al tocar el suelo
    return;
  }

  // 3. Colisión con los Targets (Distancia entre centros)
  detectarColisiones(state);
}

export function detectarColisiones(state: State): void {
  // Si la bala no está en vuelo, no hay nada que calcular
  if (!state.bala.activo) return;

  for (let i = 0; i < state.targets.length; i++) {
    const target = state.targets[i];
    
    // Ignorar blancos ya destruidos
    if (!target.activo) continue;

    // 1. Restar los vectores de posición (dx, dy, dz)
    const dx = state.bala.posicion[0] - target.posicion[0];
    const dy = state.bala.posicion[1] - target.posicion[1];
    const dz = state.bala.posicion[2] - target.posicion[2];

    // 2. Magnitud al cuadrado (Evitamos Math.sqrt)
    const distanciaCuadrada = dx * dx + dy * dy + dz * dz;

    // 3. Suma de los radios al cuadrado
    const sumaRadios = 0.015 + target.radio;

    // 4. Comprobar superposición
    if (distanciaCuadrada < sumaRadios * sumaRadios) {
      // ¡Colisión detectada!
      target.activo = false;       // Desactivar el objetivo
      state.bala.activo = false; // Ocultar/Destruir la bala
      crearExplosion([ target.posicion[0], target.posicion[1], target.posicion[2]], state);
      // Guardar el historial de bala destruida
      state.targetHistory.push({ ...target });
      // Salir del bucle para que una misma bala no destruya dos objetivos a la vez
      break; 
    }
  }
}

export function crearExplosion(centro: [number, number, number], state: State): void {
  // Generar 12 pequeños fragmentos por explosión
  for (let i = 0; i < 12; i++) {
    const vx = (Math.random() - 0.5) * 3; // Velocidad X aleatoria
    const vy = (Math.random() - 0.2) * 4; // Velocidad Y aleatoria (tendencia hacia arriba)
    const vz = (Math.random() - 0.5) * 3; // Velocidad Z aleatoria
    
    const life = 0.3 + Math.random() * 0.4; // Vivirán entre 0.3 y 0.7 segundos

    state.particulas.push({
      posicion: [centro[0], centro[1], centro[2]],
      velocidad: [vx, vy, vz],
      vida: life,
      maxVida: life
    });
  }
}



export function actualizarParticulas(dt: number, state: State): void {
  // Iterar en reversa para poder eliminar elementos del arreglo sin romper el índice
  for (let i = state.particulas.length - 1; i >= 0; i--) {
    const p = state.particulas[i];
    p.vida -= dt;
    
    if (p.vida <= 0) {
      state.particulas.splice(i, 1); // Eliminar partícula muerta
      continue;
    }

    // Aplicar gravedad y mover
    p.velocidad[1] -= 4.5 * dt; 
    p.posicion[0] += p.velocidad[0] * dt;
    p.posicion[1] += p.velocidad[1] * dt;
    p.posicion[2] += p.velocidad[2] * dt;
  }
}