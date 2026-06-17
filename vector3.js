class VectorLib {
    new(x, y, z) {
        return {x, y, z}
    }

    zero = this.new(0,0,0)

    add(v1, v2) {
        v1.x += v2.x;
        v1.y += v2.y;
        v1.z += v2.z;
    }

    add2(v1, v2) {
        return {x: v1.x + v2.x, y: v1.y + v2.y, z: v1.z + v2.z}
    }

    subtract(v1, v2) {
        v1.x -= v2.x;
        v1.y -= v2.y;
        v1.z -= v2.z;
    }

    subtract2(v1, v2) {
        return {x: v1.x - v2.x, y: v1.y - v2.y, z: v1.z - v2.z}
    }

    dot(v1, v2) {
        return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    }

    magnitude(v) {
        return Math.sqrt(this.dot(v, v))
    }

    magSquared(v) {
        return this.dot(v, v)
    }

    mult(v, k) {
        v.x *= k;
        v.y *= k;
        v.z *= k;
    }

    mult2(v, k) {
        return {x: v.x * k, y: v.y * k, z: v.z * k}
    }

    unit(v) {
        this.mult(v, 1 / this.magnitude(v))
    }

    unit2(v) {
        return this.mult2(v, 1 / this.magnitude(v))
    }

    copy(v1, v2) {
        v1.x = v2.x;
        v1.y = v2.y;
        v1.z = v2.z;
    }

    clone(v) {
        return {x: v.x, y: v.y, z: v.z}
    }

    setMagnitude(v, mag) {
        this.mult(v, mag / this.magnitude(v))
    }

    distance(v1, v2) {
        const dx = v1.x - v2.x;
        const dy = v1.y - v2.y;
        const dz = v1.z - v2.z;
        return Math.hypot(dx, dy, dz)
    }
}

export const Vector = new VectorLib()