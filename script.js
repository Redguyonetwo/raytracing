// https://gabrielgambetta.com/computer-graphics-from-scratch/03-light.html

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

const POINT_LIGHTS = [];

const DIRECTIONAL_LIGHTS = [];

const DEFAULT_COLOUR = "rgb(17, 17, 86)";

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

    return Vector.new(vx, vy, VIEWPORT_DIST)
}

function viewportToCanvas(x, y) {
    let cx = x * CONVERSION_INV.w + CENTRE.w;
    let cy = y * CONVERSION_INV.h + CENTRE.h;

    return Vector.new(cx, cy, 0)
}

function getPointAlongVector(v, t) {
    return Vector.mult2(v, t)
}

function getSphereLineIntersection(p, s) {
    // V is direction vector from camera, as camera is at O

    let v = Vector.subtract2(p, camera)

    let a = Vector.dot(v, v);
    let b = -2 * Vector.dot(s, v);
    let c = Vector.dot(s, s) - (s.r * s.r)

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

    if (t1 >= 1) { // Smaller value > 1 => P(t1) is beyond viewport, first intersection
        return t1;
    }
    if (t2 >= 1) {
        return t2;
    }
    return null;
}

function getColour(v) {
    let min_t = Infinity;
    let closest_sphere = null;

    for (let s of SPHERES) {
        let t = getSphereLineIntersection(v, s);

        if (t == null) continue;

        if (t < min_t) {
            min_t = t;
            closest_sphere = s;
        }
    }

    if (closest_sphere == null) return DEFAULT_COLOUR;

    let p = Vector.mult2(v, min_t);

    let normal = Vector.subtract2(p, closest_sphere)

    Vector.unit(normal);

    let intensity = getLightLevel(p, normal, closest_sphere.s) / max_intensity;

    let r = closest_sphere.c.r * intensity
    let g = closest_sphere.c.g * intensity
    let b = closest_sphere.c.b * intensity

    return `rgb(${r}, ${g}, ${b})`
}

function getLightLevel(p, n, s) {
    // If camera is at O, view vector from P to camera = -P

    let V = Vector.subtract2(camera, p)

    Vector.unit(V)

    let i = AMBIENT_LIGHT_INTENSITY;

    for (let pl of POINT_LIGHTS) {
        let L = Vector.subtract2(pl, p);

        Vector.unit(L);

        let dot = Vector.dot(n, L)

        // Diffuse reflections

        if (dot > 0) {
            i += pl.i * dot;
        }

        // Specular reflections (shiny)

        if (s != -1) {
            let Rmult = 2 * dot;

            let R = Vector.mult2(n, Rmult)

            Vector.subtract(R, L)

            let dot2 = Vector.dot(R, V)

            if (dot2 > 0) {
                i += pl.i * Math.pow(dot2, s) // (cos theta)**s
            }
        }
    }

    for (let dl of DIRECTIONAL_LIGHTS) {
        let L = Vector.unit2(dl)

        let dot = Vector.dot(n, L)

        // Diffuse reflection

        if (dot > 0) {
            i += dl.i * dot;
        }

        // Specular reflections (shiny)

        if (s != -1) {
            let Rmult = 2 * dot;

            let R = Vector.mult2(n, Rmult)

            Vector.subtract(R, L)

            let dot2 = Vector.dot(R, V)

            if (dot2 > 0) {
                i += dl.i * Math.pow(dot2, s) // (cos theta)**s
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

const s1 = {x: 0, y: -1, z: 3, r: 1, c: {r: 255, g: 0, b: 0}, s: 500}

const s2 = {x: 2, y: 0, z: 4, r: 1, c: {r: 0, g: 0, b: 255}, s: 500}

const s3 = {x: -2, y: 0, z: 4, r: 1, c: {r: 0, g: 255, b: 0}, s: 10}

SPHERES.push(s1, s2, s3)

const p1 = {i: 0.6, x: 2, y: 1, z: 0}

const d1 = {i: 0.2, x: 1, y: 4, z: 4}

POINT_LIGHTS.push(p1)

DIRECTIONAL_LIGHTS.push(d1)

ctx.translate(0, CANVAS.h)
ctx.scale(1, -1)

const sumI = (sum, light) => sum + light.i;

max_intensity = AMBIENT_LIGHT_INTENSITY + POINT_LIGHTS.reduce(sumI, 0) + DIRECTIONAL_LIGHTS.reduce(sumI, 0)

console.log(max_intensity)

for (let x = 0; x < CANVAS.w; x++) {
    for (let y = 0; y < CANVAS.h; y++) {
        // Make (0,0) the centre of the viewport
        let v = canvasToViewport(x, y);

        let colour = getColour(v)

        ctx.fillStyle = colour

        ctx.fillRect(x, y, 1, 1)
    }
}

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