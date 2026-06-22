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

let DEFAULT_COLOUR;

let max_intensity = 1;

const SPHERES = [];

const LIGHTS = [];

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
    let Rmult = -2 * Vector.dot(ray, normal) // make 2 negative because better than Vector.mult(-1)

    let v = Vector.mult2(normal, Rmult)

    Vector.add(v, ray) // then have to add because given -ray

    return v;
}

function getSphereLineIntersection(origin, direction, s, t_min = 1, is_camera) {
    let co, c;
    if (is_camera) {
        // Use stored variables
        co = s.co;
        c = s.dotr;
    }
    // Vector from sphere centre to ray origin
    else {
        co = Vector.subtract2(origin, s);
        c = Vector.dot(co, co) - s.r2;
    }

    // let a = Vector.dot(direction, direction); - direction is always a unit vector, so a = 1;
    let b = 2 * Vector.dot(co, direction);
    //let c = Vector.dot(co, co) - s.r2;

    let discriminant = b * b - 4 * c;

    if (discriminant < 0) {
        return null;
    }
    if (discriminant == 0) {
        return -b * 0.5;
    }

    let sqrt = Math.sqrt(discriminant)

    let t1 = (-b - sqrt) * 0.5;
    let t2 = (-b + sqrt) * 0.5;

    if (t1 >= t_min) { // Smaller value > 1 => P(t1) is beyond viewport, first intersection
        return t1;
    }
    if (t2 >= t_min) {
        return t2;
    }
    return null;
}

function getFirstIntersection(origin, direction, t_min, t_max, is_camera) {
    let best_t = Infinity;
    let closest_sphere = null;

    for (let s of SPHERES) {
        let t = getSphereLineIntersection(origin, direction, s, t_min, is_camera)

        if (t == null) continue;

        if (t < best_t && t > t_min && t < t_max) {
            best_t = t;
            closest_sphere = s;
        }
    }

    return {t: best_t, s: closest_sphere}
} 

function isInShadow(origin, direction, t_min, t_max, is_camera) {
    let best_t = Infinity;
    let closest_sphere = null;

    for (let s of SPHERES) {
        let t = getSphereLineIntersection(origin, direction, s, t_min, is_camera)

        if (t == null) continue;

        if (t >= t_min && t <= t_max) {
            return true;
        }
    }

    return false;
}

function getColour(origin, v, t_min = 1, recursion_depth = 3, is_camera = true) {
    let {t, s} = getFirstIntersection(origin, v, t_min, Infinity, is_camera)

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

    let reflected = reflectRay(v, normal)

    let {r: reflected_r, g: reflected_g, b: reflected_b} = getColour(p, reflected, 1e-3, recursion_depth - 1, false)

    let m = 1 - s.reflective;
    r *= m
    g *= m
    b *= m

    // reflected_r *= s.reflective
    // reflected_g *= s.reflective
    // reflected_b *= s.reflective

    r += reflected_r * s.reflective;
    g += reflected_g * s.reflective;
    b += reflected_b * s.reflective;

    return {r,g,b}
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

        let shadow = isInShadow(p, L, 1e-3, t_max, false) // either use isInShadow or getFirstIntersection, but i think this is faster
        
        if (shadow) {
            // console.log('in shadow')
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

const s1 = {x: 0.1, y: -1, z: 3, r: 1, c: {r: 255, g: 0, b: 0}, s: 50, reflective: 0.3}

const s2 = {x: 2, y: 0, z: 4, r: 1, c: {r: 0, g: 0, b: 255}, s: 20, reflective: 0.35}

const s3 = {x: -2, y: 0, z: 4, r: 1, c: {r: 0, g: 255, b: 0}, s: 10, reflective: 0.4}

const s4 = {x: 0, y: -5001, z: 0, r: 5000, c: {r: 255, g: 255, b: 100}, s: -1, reflective: 0}

const s5 = {x: 1, y: 2, z: 7, r: 1.5, c: {r: 255, g: 0, b: 255}, s: 50, reflective: 0.4}

SPHERES.push(s1, s2, s3, s4, s5)

const p1 = {type: 'p', i: 0.6, x: 0, y: 1, z: 3.5}

const d1 = {type: 'd', i: 0.2, x: 1, y: 4, z: 4} //this is a direction vector, not position

LIGHTS.push(p1, d1)

ctx.translate(0, CANVAS.h)
ctx.scale(1, -1)

const sumI = (sum, light) => sum + light.i;

max_intensity = AMBIENT_LIGHT_INTENSITY + LIGHTS.reduce(sumI, 0)

let rgb = 255 * AMBIENT_LIGHT_INTENSITY / max_intensity;

DEFAULT_COLOUR = {r: rgb, g: rgb, b: rgb};

for (let s of SPHERES) {
    s.r2 = s.r * s.r;
    s.co = Vector.subtract2(camera, s)
    s.dotr = Vector.dot(s.co, s.co) - s.r2;
}

console.log(max_intensity)

let startTime = performance.now()

for (let x = 0; x < CANVAS.w; x++) {
    for (let y = 0; y < CANVAS.h; y++) {
        // Make (0,0) the centre of the viewport
        let v = canvasToViewport(x, y);

        Vector.subtract(v, camera)

        Vector.unit(v)

        let {r, g, b} = getColour(camera, v, 1, 5)

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`

        ctx.fillRect(x, y, 1, 1)
    }
}

console.log('done in', ((performance.now() - startTime) * 0.001).toPrecision(3), 'seconds')

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