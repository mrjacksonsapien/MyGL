export class MyGLMath {
    static degToRad(degrees) {
        return degrees * (Math.PI / 180);
    }
    static cot(degrees) {
        return 1 / Math.tan(MyGLMath.degToRad(degrees));
    }
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
}

export class Matrix {
    constructor(camera) {
        this.updateCurrentMatrix(camera);
    }

    updateCurrentMatrix(camera) {
        this.currentMatrix = Matrix.createMatrix(camera);
    }

    static createMatrix(camera) {
        let matrix = Matrix.multiply4x4Matrices(Matrix.createTranslationMatrix(camera), Matrix.multiply4x4Matrices(Matrix.createEulerMatrix(camera), Matrix.createProjectionMatrix(camera)));
        return matrix;
    }

    static multiply4x4Matrices(a, b) {
        let result = [];
        for (let i = 0; i < 4; i++) {
            result[i] = [];
            for (let j = 0; j < 4; j++) {
                result[i][j] = 0;
                for (let k = 0; k < 4; k++) {
                    result[i][j] += a[i][k] * b[k][j];
                }
            }
        }
        return result;
    }

    static createTranslationMatrix(camera) {
        return [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [camera.position.x, camera.position.y, camera.position.z, 1]
        ];
    }

    static createPitchMatrix(pitchDegrees) {
        const pitch = MyGLMath.degToRad(pitchDegrees);

        return [
            [1, 0, 0, 0],
            [0, Math.cos(pitch), -Math.sin(pitch), 0],
            [0, Math.sin(pitch), Math.cos(pitch), 0],
            [0, 0, 0, 1]
        ];
    }

    static createYawMatrix(yawDegrees) {
        const yaw = MyGLMath.degToRad(yawDegrees);

        return [
            [Math.cos(yaw), 0, Math.sin(yaw), 0],
            [0, 1, 0, 0],
            [-Math.sin(yaw), 0, Math.cos(yaw), 0],
            [0, 0, 0, 1]
        ];
    }

    static createRollMatrix(rollDegrees) {
        const roll = MyGLMath.degToRad(rollDegrees);

        return [
            [Math.cos(roll), -Math.sin(roll), 0, 0],
            [Math.sin(roll), Math.cos(roll), 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1]
        ];
    }

    static createEulerMatrix(camera) {
        return Matrix.multiply4x4Matrices(Matrix.multiply4x4Matrices(Matrix.createYawMatrix(camera.orientation.y), Matrix.createPitchMatrix(camera.orientation.x)), Matrix.createRollMatrix(camera.orientation.z));
    }

    static createProjectionMatrix(camera) {
        const aspectRatio = camera.canvas.clientWidth / camera.canvas.clientHeight;

        return [
            [MyGLMath.cot(camera.fov / 2) / aspectRatio, 0, 0, 0],
            [0, MyGLMath.cot(camera.fov / 2), 0, 0],
            [0, 0, -(camera.far / (camera.far - camera.near)), -1],
            [0, 0, ((camera.far * camera.near) / (camera.far - camera.near)), 0]
        ];
    }
}

export class Scene {
    constructor(camera) {
        this.currentCamera = camera;
        this.instances = [];
    }

    add(instance) {
        this.instances.push(instance);
    }

    remove(instance) {
        let index = this.instances.indexOf(instance);
        if (index !== -1) {
            this.instances.splice(index, 1);
        }
    }

    render() {
        this.instances.forEach(instance => {
            instance.act();   
        });
        if (this.currentCamera != null) {
            this.currentCamera.render(this);
        }
    }
}

export class Instance {
    constructor(vertices, indices) {
        this.vertices = vertices;
        this.indices = indices;
        this.act = () => {};
    }

    projectVertices(camera) {
        this.vertices.forEach(vertex => {
            vertex.project(camera);
        });
    }

    showIndices(camera) {
        for (let i = 0; i < this.indices.length; i++) {
            const index = this.indices[i];

            if (index.isReadyForRendering()) {
                let ctx = camera.canvas.getContext('2d');

                let [x1, y1] = [index.vertex1.vec2Position.x, index.vertex1.vec2Position.y];
                let [x2, y2] = [index.vertex2.vec2Position.x, index.vertex2.vec2Position.y];
    
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.closePath();
                ctx.lineWidth = 1;
                ctx.strokeStyle = 'black';
                ctx.stroke();
            }
        }
    }
}

export class Camera {
    constructor(canvas, near, far, fov, position, orientation, speed) {
        this.canvas = canvas;
        this.near = near;
        this.far = far;
        this.fov = fov;

        this.position = position;
        this.orientation = orientation;

        this.speed = speed;

        this.matrix = new Matrix(this);
        this.ctx = this.canvas.getContext('2d');
    }

    render(scene) {
        this.ctx.clearRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
        
        this.matrix.updateCurrentMatrix(this);

        // Always project everything first before doing any other rendering
        scene.instances.forEach(instance => {
            instance.projectVertices(this);
        });

        scene.instances.forEach(instance => {
            instance.showIndices(this);
        });
    }
}

export class Index {
    constructor(vertex1, vertex2) {
        this.vertex1 = vertex1;
        this.vertex2 = vertex2;
    }

    isReadyForRendering() {
        return this.vertex1.inFrustum && this.vertex2.inFrustum;
    }
}

export class Vertex {
    constructor(position) {
        this.vec3 = position;
        this.NDC = null;
        this.vec2 = null;
        this.inFrustum = false;
    }

    isInFrustum() {
        return (
            this.NDC.x >= -1 && this.NDC.x <= 1 &&
            this.NDC.y >= -1 && this.NDC.y <= 1 &&
            this.NDC.z >= 0 && this.NDC.z <= 1
        );
    }

    project(camera) {
        let vertex = {
            x: this.vec3.x,
            y: this.vec3.y,
            z: this.vec3.z,
            w: 1
        }

        let matrix = camera.matrix.currentMatrix;

        // Projection with matrix
        let projectedVertex = {
            x: vertex.x * matrix[0][0] + vertex.y * matrix[1][0] + vertex.z * matrix[2][0] + vertex.w * matrix[3][0],
            y: vertex.x * matrix[0][1] + vertex.y * matrix[1][1] + vertex.z * matrix[2][1] + vertex.w * matrix[3][1],
            z: vertex.x * matrix[0][2] + vertex.y * matrix[1][2] + vertex.z * matrix[2][2] + vertex.w * matrix[3][2],
            w: vertex.x * matrix[0][3] + vertex.y * matrix[1][3] + vertex.z * matrix[2][3] + vertex.w * matrix[3][3]
        };

        // Homogeneous division by w
        projectedVertex.x /= projectedVertex.w;
        projectedVertex.y /= projectedVertex.w;
        projectedVertex.z /= projectedVertex.w;

        // Final normalized-device-coordinates
        this.NDC = new Vector3(projectedVertex.x, projectedVertex.y, projectedVertex.z);

        let canvasX = (this.NDC.x + 1) * 0.5 * camera.canvas.clientWidth;
        let canvasY = (1 - this.NDC.y) * 0.5 * camera.canvas.clientHeight;

        // Canvas 2D coordinates
        this.vec2Position = new Vector2(canvasX, canvasY);

        // Check if vertex is in camera frustum
        this.inFrustum = this.isInFrustum();
    }
}

export class Vector3 {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
}

export class Vector2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

// Templates //

export class Cube extends Instance {
    constructor(position, size) {
        super();
        this.position = position;
        this.size = size;

        this.vertices = [
            new Vertex(new Vector3(this.position.x - this.size.x / 2, this.position.y + this.size.y / 2, this.position.z - this.size.z / 2)),
            new Vertex(new Vector3(this.position.x + this.size.x / 2, this.position.y + this.size.y / 2, this.position.z - this.size.z / 2)),
            new Vertex(new Vector3(this.position.x + this.size.x / 2, this.position.y - this.size.y / 2, this.position.z - this.size.z / 2)),
            new Vertex(new Vector3(this.position.x - this.size.x / 2, this.position.y - this.size.y / 2, this.position.z - this.size.z / 2)),
            new Vertex(new Vector3(this.position.x - this.size.x / 2, this.position.y + this.size.y / 2, this.position.z + this.size.z / 2)),
            new Vertex(new Vector3(this.position.x + this.size.x / 2, this.position.y + this.size.y / 2, this.position.z + this.size.z / 2)),
            new Vertex(new Vector3(this.position.x + this.size.x / 2, this.position.y - this.size.y / 2, this.position.z + this.size.z / 2)),
            new Vertex(new Vector3(this.position.x - this.size.x / 2, this.position.y - this.size.y / 2, this.position.z + this.size.z / 2))
        ];
        this.indices = [
            new Index(this.vertices[0], this.vertices[1]),
            new Index(this.vertices[1], this.vertices[2]),
            new Index(this.vertices[2], this.vertices[3]),
            new Index(this.vertices[3], this.vertices[0]),

            new Index(this.vertices[4], this.vertices[5]),
            new Index(this.vertices[5], this.vertices[6]),
            new Index(this.vertices[6], this.vertices[7]),
            new Index(this.vertices[7], this.vertices[4]),

            new Index(this.vertices[0], this.vertices[4]),
            new Index(this.vertices[1], this.vertices[5]),
            new Index(this.vertices[2], this.vertices[6]),
            new Index(this.vertices[3], this.vertices[7])
        ];
    }
}