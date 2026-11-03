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
  const g = 4.5;

  // Pivote del tubo y bala en reposo (deben coincidir con main.ts)
  const PIVOTE_Y = 0.635; // 0.61 (esfera) + 0.025 (pivote del tubo)
  const PIVOTE_Z = 2.5;
  const L = 0.165;        // distancia de la bala en reposo a lo largo del tubo

  // Rangos permitidos: sobre el suelo y visibles por la cámara
  const Y_MIN = 0.75, Y_MAX = 1.15;
  const Z_MIN = 0.5,  Z_MAX = 2.1;
  const X_MAX = 0.6;               // dentro del recorrido de la torreta (±0.65)
  const SEP_Y = 0.12, SEP_Z = 0.2; // separación mínima entre objetivos

  for (let intento = 0; intento < 1000; intento++) {
    const targets: Target[] = [];

    for (let i = 0; i < cantidad; i++) {
      // Objetivo i -> nivel de fuerza i: cada nivel tiene al menos uno alcanzable
      const v0 = POTENCIAS[i % POTENCIAS.length];
      let colocado = false;

      for (let k = 0; k < 500 && !colocado; k++) {
        // Punto de una trayectoria real: ángulo y tiempo de vuelo aleatorios
        const ang = ((10 + Math.random() * 78) * Math.PI) / 180;
        const t = 0.15 + Math.random() * 1.2;

        const y0 = PIVOTE_Y + L * Math.sin(ang);
        const z0 = PIVOTE_Z - L * Math.cos(ang);
        const y = y0 + v0 * Math.sin(ang) * t - 0.5 * g * t * t;
        const z = z0 - v0 * Math.cos(ang) * t;

        if (y < Y_MIN || y > Y_MAX || z < Z_MIN || z > Z_MAX) continue;

        // Profundidad Y altura distintas respecto a los ya colocados
        const choca = targets.some(
          (o) => Math.abs(o.posicion[1] - y) < SEP_Y || Math.abs(o.posicion[2] - z) < SEP_Z
        );
        if (choca) continue;

        const x = -X_MAX + Math.random() * 2 * X_MAX;
        targets.push({ posicion: [x, y, z], activo: true, radio: 0.06 });
        colocado = true;
      }
      if (!colocado) break; // reintentar todo (en la práctica casi nunca ocurre)
    }

    if (targets.length === cantidad) return targets;
  }
  return [];
}

export function actualizarFisica(deltaTime: number, state: State) {
  if (!state.bala.activo) return;

  const b = state.bala;

  // 1. Integración de movimiento parabólico
  b.posicion[0] += b.velocidad[0] * deltaTime;
  b.posicion[1] += b.velocidad[1] * deltaTime - 0.5 * 4.5 * deltaTime * deltaTime;
  b.posicion[2] += b.velocidad[2] * deltaTime;
  b.velocidad[1] -= 4.5 * deltaTime;

  // 2. Colisión con el Piso / Base (Y <= 0.5)
  if (b.posicion[1] - 0.024 <= 0.5) {
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
    const sumaRadios = 0.024 + target.radio;

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