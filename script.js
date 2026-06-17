// https://gabrielgambetta.com/computer-graphics-from-scratch/

import { Vector } from "./vector3.js";

const CANVAS_ELEMENT = document.getElementById('canvas');
CANVAS_ELEMENT.width = innerWidth;
CANVAS_ELEMENT.height = innerHeight;

const ctx = CANVAS_ELEMENT.getContext('2d');

const CANVAS = {w: CANVAS_ELEMENT.width, h: CANVAS_ELEMENT.height};

console.log(CANVAS.w, 'x', CANVAS.h, '=>', CANVAS.w * CANVAS.h, 'pixels')

const CENTRE = {w: CANVAS.w * 0.5, h: CANVAS.h * 0.5}

const VIEWPORT = {w: 1.5, h: 1};

const VIEWPORT_CENTRE = {x: VIEWPORT.w * 0.5, y: VIEWPORT.h * 0.5}

console.log('Viewport size:', VIEWPORT.w + ' x ' + VIEWPORT.h)

const CONVERSION = {w: VIEWPORT.w / CANVAS.w, h: VIEWPORT.h / CANVAS.h}

const CONVERSION_INV = {w: 1 / CONVERSION.w, h: 1 / CONVERSION.h}

const camera = Vector.new(0,0,0)

const VIEWPORT_DIST = 1.1;

const AMBIENT_LIGHT_INTENSITY = 0.2;

const AMBIENT_RGB_VALUE = 50;

let max_intensity = 1;

const SPHERES = [];

const LIGHTS = [];

const DEFAULT_COLOUR = {r: 17, g:17, b: 86};

// Raytracing

function addSphere(x, y, z, r, c = {r: 255, g: 0, b: 0}) {
    let s = Vector.new(x, y, z);
    s.r = r;
    s.c = c;
    SPHERES.push(s);
}

function canvasToViewport(x, y) {
    let vx = (x - CENTRE.w) * CONVERSION.w;
    let vy = (y - CENTRE.h) * CONVERSION.h;

    let v = Vector.new(vx, vy, VIEWPORT_DIST)

    Vector.add(v, camera)

    return v;
}

function viewportToCanvas(x, y) {
    let cx = x * CONVERSION_INV.w + CENTRE.w;
    let cy = y * CONVERSION_INV.h + CENTRE.h;

    return Vector.new(cx, cy, 0)
}

function getPointAlongVector(v, t) {
    return Vector.mult2(v, t)
}

function reflectRay(ray, normal) {
    let Rmult = 2 * Vector.dot(ray, normal)

    let v = Vector.mult2(normal, Rmult)

    Vector.subtract(v, ray)

    return v;
}

function getSphereLineIntersection(origin, direction, s, t_min = 1) {
    // Vector from sphere center to ray origin
    let co = Vector.subtract2(origin, s);

    let a = Vector.dot(direction, direction);
    let b = 2 * Vector.dot(co, direction);
    let c = Vector.dot(co, co) - (s.r * s.r);

    let discriminant = b * b - 4 * a * c;

    if (discriminant < 0) {
        return null;
    }
    if (discriminant == 0) {
        return -b / (2 * a);
    }

    let sqrt = Math.sqrt(discriminant)

    let t1 = (-b - sqrt) / (2 * a);
    let t2 = (-b + sqrt) / (2 * a);

    if (t1 >= t_min) { // Smaller value > 1 => P(t1) is beyond viewport, first intersection
        return t1;
    }
    if (t2 >= t_min) {
        return t2;
    }
    return null;
}

function getFirstIntersection(origin, direction, t_min, t_max) {
    let best_t = Infinity;
    let closest_sphere = null;

    for (let s of SPHERES) {
        let t = getSphereLineIntersection(origin, direction, s, t_min)

        if (t == null) continue;

        if (t < best_t && t > t_min && t < t_max) {
            best_t = t;
            closest_sphere = s;
        }
    }

    return {t: best_t, s: closest_sphere}
} 

function getColour(origin, v, t_min = 1, recursion_depth = 3) {
    let {t, s} = getFirstIntersection(origin, v, t_min, Infinity)

    if (s == null) return DEFAULT_COLOUR;

    let p = Vector.mult2(v, t);

    let normal = Vector.subtract2(p, s)

    Vector.unit(normal);

    let intensity = getLightLevel(p, normal, s.s) / max_intensity;

    let r = s.c.r * intensity
    let g = s.c.g * intensity
    let b = s.c.b * intensity

    if (recursion_depth <= 0 || s.reflective <= 0) {
        return {r, g, b}
    }

    let reflected = reflectRay(Vector.mult2(v, -1), normal)

    let {r: reflected_r, g: reflected_g, b: reflected_b} = getColour(p, reflected, 1e-3, recursion_depth - 1)

    r *= (1 - s.reflective)
    g *= (1 - s.reflective)
    b *= (1 - s.reflective)

    reflected_r *= s.reflective
    reflected_g *= s.reflective
    reflected_b *= s.reflective

    return {r: r + reflected_r, g: g + reflected_g, b: b + reflected_b}
}

function getLightLevel(p, n, s) {
    // If camera is at O, view vector from P to camera = -P

    let V = Vector.subtract2(camera, p)

    Vector.unit(V)

    let i = AMBIENT_LIGHT_INTENSITY;

    for (let light of LIGHTS) {
        let L, t_max;
        if (light.type == 'p') {
            L = Vector.subtract2(light, p);

            t_max = Vector.magnitude(L)

            Vector.unit(L);
        }
        else if (light.type == 'd') {
            L = Vector.unit2(light)

            Vector.mult(L, -1)

            t_max = Infinity;
        }

        // Shadows

        let {t: shadow_t, s: shadow_s} = getFirstIntersection(p, L, 1e-3, t_max)
        
        if (shadow_s != null) {
            //console.log('in shadow')
            continue;
        }

        // Diffuse reflections

        let dot = Vector.dot(n, L)

        if (dot > 0) {
            i += light.i * dot;
        }

        // Specular reflections (shiny)

        if (s != -1) {
            let Rmult = 2 * dot;

            let R = Vector.mult2(n, Rmult)

            Vector.subtract(R, L)

            let dot2 = Vector.dot(R, V)

            if (dot2 > 0) {
                i += light.i * Math.pow(dot2, s) // (cos theta)**s
            }
        }
    }

    return i;
}

// Drawing

function clear() {
    ctx.clearRect(0, 0, CANVAS.w, CANVAS.h);
}

// Main

const s1 = {x: 0, y: -1, z: 3, r: 1, c: {r: 255, g: 0, b: 0}, s: 500, reflective: 0.2}

const s2 = {x: 2, y: 0, z: 4, r: 1, c: {r: 0, g: 0, b: 255}, s: 500, reflective: 0.3}

const s3 = {x: -2, y: 0, z: 4, r: 1, c: {r: 0, g: 255, b: 0}, s: 10, reflective: 0.4}

const s4 = {x: 0, y: -5001, z: 0, r: 5000, c: {r: 100, g: 255, b: 100}, s: 1000, reflective: 0.3}

SPHERES.push(s1, s2, s3, s4)

const p1 = {type: 'p', i: 0.6, x: 2, y: 1, z: 0}

const d1 = {type: 'd', i: 0.2, x: 1, y: 4, z: 4}

LIGHTS.push(p1, d1)

ctx.translate(0, CANVAS.h)
ctx.scale(1, -1)

const sumI = (sum, light) => sum + light.i;

max_intensity = AMBIENT_LIGHT_INTENSITY + LIGHTS.reduce(sumI, 0)

console.log(max_intensity)

for (let x = 0; x < CANVAS.w; x++) {
    for (let y = 0; y < CANVAS.h; y++) {
        // Make (0,0) the centre of the viewport
        let v = canvasToViewport(x, y);

        Vector.subtract(v, camera)

        Vector.unit(v)

        let {r, g, b} = getColour(camera, v)

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`

        ctx.fillRect(x, y, 1, 1)
    }
}

console.log('done')

if (false) {
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 1

    ctx.beginPath()

    for (let i = 0; i < VIEWPORT.w; i++) {
        let x = i * CONVERSION_INV.w

        ctx.moveTo(x, 0)
        ctx.lineTo(x, CANVAS.h)
    }

    for (let i = 0; i < VIEWPORT.w; i++) {
        let y = i * CONVERSION_INV.h

        ctx.moveTo(0, y)
        ctx.lineTo(CANVAS.w, y)
    }

    ctx.stroke()

    ctx.lineWidth = 2;

    let x = VIEWPORT_CENTRE.x * CONVERSION_INV.w;
    let y = VIEWPORT_CENTRE.y * CONVERSION_INV.h;

    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, CANVAS.h)
    ctx.moveTo(0, y)
    ctx.lineTo(CANVAS.w, y)
    ctx.stroke()
}