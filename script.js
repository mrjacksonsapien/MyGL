import * as mygl from './mygl.js';
window.mygl = mygl;

let canvas = document.getElementById("renderViewport");
let ctx = canvas.getContext("2d");

let fps = 60;

let camera1 = new mygl.Camera(
    canvas,
    0.1, // near
    10, // far
    70, // fov
    new mygl.Vector3(0, 0, 0), // position
    new mygl.Vector3(0, 0, 0), // orientation
    0.015,
);

let scene = new mygl.Scene(camera1);

let keys = {};

document.addEventListener("keydown", (event) => {
    let key = event.key;

    if (key.length == 1) {
        key = key.toLowerCase();
    }

    keys[key] = true;
});

document.addEventListener("keyup", (event) => {
    let key = event.key;

    if (key.length == 1) {
        key = key.toLowerCase();
    }

    keys[key] = false;
});

document.addEventListener('DOMContentLoaded', () => {
    canvas.addEventListener('click', () => {
        canvas.requestPointerLock({unadjustedMovement: true});
        addEventListener('mousemove', handleMouseMove);
        addEventListener('wheel', handleMouseScroll);
    });

    function handleMouseMove(event) {
        let currentCamera = scene.currentCamera;

        let mouseXMovement = event.movementX;
        let mouseYMovement = event.movementY;
    
        currentCamera.orientation.y -= mouseXMovement * currentCamera.speed * 10;
    
        currentCamera.orientation.x -= mouseYMovement * currentCamera.speed * 10;

        let distanceFrom90 = Math.abs(90 - currentCamera.orientation.x);
        let distanceFrom270 = Math.abs(270 - currentCamera.orientation.x);

        // Clamp camera
        if (currentCamera.orientation.x > 90 && currentCamera.orientation.x < 270) {
            if (distanceFrom90 <= distanceFrom270) {
                currentCamera.orientation.x = 90;
            } else {
                currentCamera.orientation.x = 270;
            }
        }
    }

    function handleMouseScroll(event) {
        let currentCamera = scene.currentCamera;

        currentCamera.NDCOffset.z -= event.deltaY / 500;

        if (currentCamera.NDCOffset.z > 0) {
            currentCamera.NDCOffset.z = 0;
        }
    }

    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === null) {
            removeEventListener('mousemove', handleMouseMove);
            removeEventListener('wheel', handleMouseScroll);
        }
    });
});

let renderLoop = setInterval(function() {
    // Logic
    /*
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    */
    handleInputs();

    // Render
    scene.render();
}, 1/fps);

function handleInputs() {
    let currentCamera = scene.currentCamera;

    if (keys["w"]) {
        currentCamera.position.x -= currentCamera.speed * Math.sin(mygl.MyGLMath.degToRad(currentCamera.orientation.y));
        currentCamera.position.z += currentCamera.speed * Math.cos(mygl.MyGLMath.degToRad(currentCamera.orientation.y));
    }
    if (keys["s"]) {
        currentCamera.position.x += currentCamera.speed * Math.sin(mygl.MyGLMath.degToRad(currentCamera.orientation.y));
        currentCamera.position.z -= currentCamera.speed * Math.cos(mygl.MyGLMath.degToRad(currentCamera.orientation.y));
    }
    if (keys["a"]) {
        currentCamera.position.x -= currentCamera.speed * Math.sin(mygl.MyGLMath.degToRad(currentCamera.orientation.y + 90));
        currentCamera.position.z -= currentCamera.speed * Math.cos(mygl.MyGLMath.degToRad(currentCamera.orientation.y - 90));
    }
    if (keys["d"]) {
        currentCamera.position.x += currentCamera.speed * Math.sin(mygl.MyGLMath.degToRad(currentCamera.orientation.y + 90));
        currentCamera.position.z += currentCamera.speed * Math.cos(mygl.MyGLMath.degToRad(currentCamera.orientation.y - 90));
    }
    if (keys[" "]) {
        currentCamera.position.y += currentCamera.speed;
    }
    if (keys["Shift"]) {
        currentCamera.position.y -= currentCamera.speed;
    }
    cameraOrientationReassignment();
}

function cameraOrientationReassignment() {
    let currentCamera = scene.currentCamera;

    currentCamera.orientation.x %= 360;
    currentCamera.orientation.y %= 360;
    currentCamera.orientation.z %= 360;

    if (currentCamera.orientation.x < 0) {
        currentCamera.orientation.x = 360 + currentCamera.orientation.x;
    }
    if (currentCamera.orientation.y < 0) {
        currentCamera.orientation.y = 360 + currentCamera.orientation.y;
    }
    if (currentCamera.orientation.z < 0) {
        currentCamera.orientation.z = 360 + currentCamera.orientation.z;
    }
}

// Assets
let cube1 = new mygl.Cube(new mygl.Vector3(0, 0, 0), new mygl.Vector3(1, 1, 1));

/*
cube1.act = () => {
    if (cube1.vertices[0].NDC != null) {
        console.log(cube1.vertices[0].NDC.z);
    }
};
*/

scene.add(cube1);