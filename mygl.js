export class MyGLMath {
    static degToRad(degrees) {
        return degrees * (Math.PI / 180);
    }
    static cot(degrees) {
        return 1 / Math.tan(MyGLMath.degToRad(degrees));
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
        var result = [];
        for (var i = 0; i < 4; i++) {
            result[i] = [];
            for (var j = 0; j < 4; j++) {
                result[i][j] = 0;
                for (var k = 0; k < 4; k++) {
                    result[i][j] += a[i][k] * b[k][j];
                }
            }
        }
        return result;
    }

    static createTranslationMatrix(camera) {
        const translationMatrix = [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [camera.position.x, camera.position.y, -camera.position.z, 1]
        ];
        return translationMatrix;
    }

    static createPitchMatrix(pitchDegrees) {
        const pitch = MyGLMath.degToRad(pitchDegrees);
        const pitchMatrix = [
            [1, 0, 0, 0],
            [0, Math.cos(pitch), -Math.sin(pitch), 0],
            [0, Math.sin(pitch), Math.cos(pitch), 0],
            [0, 0, 0, 1]
        ];
        return pitchMatrix;
    }

    static createYawMatrix(yawDegrees) {
        const yaw = MyGLMath.degToRad(yawDegrees);
        const yawMatrix = [
            [Math.cos(yaw), 0, Math.sin(yaw), 0],
            [0, 1, 0, 0],
            [-Math.sin(yaw), 0, Math.cos(yaw), 0],
            [0, 0, 0, 1]
        ];
        return yawMatrix;
    }

    static createRollMatrix(rollDegrees) {
        const roll = MyGLMath.degToRad(rollDegrees);
        const rollMatrix = [
            [Math.cos(roll), -Math.sin(roll), 0, 0],
            [Math.sin(roll), Math.cos(roll), 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1]
        ];
        return rollMatrix;
    }

    static createEulerMatrix(camera) {
        return Matrix.multiply4x4Matrices(Matrix.multiply4x4Matrices(Matrix.createYawMatrix(camera.orientation.y), Matrix.createPitchMatrix(camera.orientation.x)), Matrix.createRollMatrix(camera.orientation.z));
    }

    static createProjectionMatrix(camera) {
        const aspectRatio = camera.canvas.clientWidth / camera.canvas.clientHeight;
        const projectionMatrix = [
            [MyGLMath.cot(camera.fov / 2) / aspectRatio, 0, 0, 0],
            [0, MyGLMath.cot(camera.fov / 2), 0, 0],
            [0, 0, -(camera.far + camera.near) / (camera.far - camera.near), -1],
            [0, 0, -(2 * camera.far * camera.near) / (camera.far - camera.near), 0]
        ];
        return projectionMatrix;
    }
}

export class World {
    constructor(camera) {
        this.currentCamera = camera;
        this.instances = [];
        this.ctx = this.currentCamera.canvas.getContext('2d');
        this.facesToRender = [];
    }

    addToWorld(instance) {
        this.instances.push(instance);
    }

    showIndices() {
        this.instances.forEach(instance => {
            instance.showIndices(this.currentCamera);
        });
    }

    computeFaces() {
        this.facesToRender = [];

        this.instances.forEach(instance => {
            instance.render(this.currentCamera);

            instance.faces.forEach(face => {
                if (face.wAverage != null) {
                    this.facesToRender.push(face);
                }
            });
        });

        this.facesToRender.sort((a, b) => a.wAverage - b.wAverage);
    }

    renderFaces() {
        this.facesToRender.forEach(face => {
            face.render(this.ctx);
        });
    }

    render() {
        if (this.currentCamera != null) {
            this.currentCamera.updateMatrix();
            this.computeFaces();
            this.renderFaces();
        }
    }
}

export class Instance {
    constructor(vertices, indices, faces) {
        this.vertices = vertices;
        this.indices = indices;
        this.faces = faces;
    }

    projectVertices(camera) {
        this.vertices.forEach(vertex => {
            vertex.project(camera);
        });
    }

    showIndices(camera) {
        for (let i = 0; i < this.indices.length; i++) {
            const index = this.indices[i];

            if (index.isReadyForRendering(camera)) {
                let ctx = camera.canvas.getContext('2d');

                let [x1, y1] = [index.vertex1.vec2Position.x, index.vertex1.vec2Position.y];
                let [x2, y2] = [index.vertex2.vec2Position.x, index.vertex2.vec2Position.y];

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.closePath();
                ctx.lineWidth = 1;
                ctx.stroke();

                let x = (x1 + x2) / 2;
                let y = (y1 + y2) / 2;

                ctx.fillStyle = "black";
                ctx.font = '20px Arial';
                ctx.fillText(i, x, y - 10);
            }
        }
    }

    render(camera) {
        this.projectVertices(camera);

        this.faces.forEach(face => {
            face.setwAverage(camera);
        });
    }
}

export class Camera extends Instance {
    constructor(canvas, near, far, fov, position, orientation, speed) {
        super();
        this.canvas = canvas;
        this.frustumPlanes = {
            near: near,
            far: far,
            top: 0,
            right: canvas.clientWidth,
            bottom: canvas.clientHeight,
            left: 0
        }
        this.fov = fov;
        this.position = position;
        this.orientation = orientation;
        this.speed = speed;
        this.matrix = new Matrix(this);
    }

    updateMatrix() {
        this.matrix.updateCurrentMatrix(this);
    }
}

export class Face {
    constructor(indices, color) {
        this.indices = indices;
        this.readyForRendering = false;
        this.wAverage = null;
        this.color = color;

        let verticesSet = new Set();

        indices.forEach(index => {
            verticesSet.add(index.vertex1);
            verticesSet.add(index.vertex2);
        });

        this.vertices = Array.from(verticesSet);
    }

    render(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();

        if (this.vertices.length > 0) {
            let firstVertex = this.vertices[0];
            ctx.moveTo(firstVertex.vec2Position.x, firstVertex.vec2Position.y);
        }

        for (let i = 1; i < this.vertices.length; i++) {
            let currentVertex = this.vertices[i];
            ctx.lineTo(currentVertex.vec2Position.x, currentVertex.vec2Position.y);
        }

        ctx.closePath();
        ctx.fill();
    }

    setwAverage(camera) {
        this.readyForRendering = false;

        this.indices.forEach(index => {
            if (index.isReadyForRendering(camera)) {
                this.readyForRendering = true;
            }
        });

        if (this.readyForRendering) {
            let wSum = 0;
            let amountOfVertices = 0;

            this.vertices.forEach(vertex => {
                wSum += vertex.w;
                amountOfVertices++;
            });

            this.wAverage = wSum / amountOfVertices;
        } else {
            this.wAverage = null;
        }
    }
}

export class Index {
    constructor(vertex1, vertex2) {
        this.vertex1 = vertex1;
        this.vertex2 = vertex2;
    }

    isReadyForRendering(camera) {
        return (this.vertex1.inFrustum || this.vertex2.inFrustum);
    }
}

export class Vertex {
    constructor(position) {
        this.vec3Position = position;
        this.w = null;
        this.vec2Position = null;
        this.inFrustum = false;
    }

    isInFrustum(camera) {
        return this.w <= -camera.frustumPlanes.near && 
        this.w >= -camera.frustumPlanes.far && 
        this.vec2Position.x >= camera.frustumPlanes.left && this.vec2Position.x <= camera.frustumPlanes.right &&
        this.vec2Position.y >= camera.frustumPlanes.top && this.vec2Position.y <= camera.frustumPlanes.bottom;
    }

    project(camera) {
        let vertex = [this.vec3Position.x, this.vec3Position.y, this.vec3Position.z, 1];
        let matrix = camera.matrix.currentMatrix;

        let projectedVertex = [
            vertex[0] * matrix[0][0] + vertex[1] * matrix[1][0] + vertex[2] * matrix[2][0] + vertex[3] * matrix[3][0],
            vertex[0] * matrix[0][1] + vertex[1] * matrix[1][1] + vertex[2] * matrix[2][1] + vertex[3] * matrix[3][1],
            vertex[0] * matrix[0][3] + vertex[1] * matrix[1][3] + vertex[2] * matrix[2][3] + vertex[3] * matrix[3][3],
        ];

        this.w = projectedVertex[2];

        projectedVertex[0] /= projectedVertex[2];
        projectedVertex[1] /= projectedVertex[2];

        if (this.w > -camera.frustumPlanes.near) {
            projectedVertex[0] = -projectedVertex[0];
            projectedVertex[1] = -projectedVertex[1];
        }

        let canvasX = (projectedVertex[0] + 1) * 0.5 * camera.canvas.clientWidth;
        let canvasY = (1 - projectedVertex[1]) * 0.5 * camera.canvas.clientHeight;

        this.vec2Position = new Vector2(canvasX, canvasY);

        if (this.isInFrustum(camera)) {
            this.inFrustum = true;
        } else {
            this.inFrustum = false;
        }
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
        this.faces = [
            new Face([this.indices[0], this.indices[1], this.indices[2], this.indices[3]], 'blue'),
            new Face([this.indices[4], this.indices[5], this.indices[6], this.indices[7]], 'blue'),
            new Face([this.indices[8], this.indices[7], this.indices[3], this.indices[11]], 'red'),
            new Face([this.indices[5], this.indices[10], this.indices[1], this.indices[9]], 'red'),
            new Face([this.indices[0], this.indices[9], this.indices[4], this.indices[8]], 'green'),
            new Face([this.indices[10], this.indices[6], this.indices[11], this.indices[2]], 'green')
        ];
    }
}