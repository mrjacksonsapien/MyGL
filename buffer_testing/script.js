const canvas = document.getElementById('viewport');
const ctx = canvas.getContext('2d');

// Draw a red rectangle on the canvas
ctx.fillStyle = 'red';
ctx.fillRect(50, 50, 100, 100);

const imageData = ctx.getImageData(0, 0, canvas.clientWidth, canvas.clientHeight);

const getColorIndicesForCoord = (x, y, width) => {
    const red = y * (width * 4) + x * 4;
    return [red, red + 1, red + 2, red + 3];
};

const xCoord = 70;
const yCoord = 70;

const colorIndices = getColorIndicesForCoord(xCoord, yCoord, canvas.clientWidth);

const [redIndex, greenIndex, blueIndex, alphaIndex] = colorIndices;

const [r, g, b, a] = [imageData.data[redIndex], imageData.data[greenIndex], imageData.data[blueIndex], imageData.data[alphaIndex]];

console.log(r, g, b, a);

ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

// Create a blank ImageData object
const imageData2 = ctx.createImageData(canvas.clientWidth, canvas.clientHeight);

// Manipulate the pixel data (for example, make every pixel red)
for (let i = 0; i < imageData2.data.length; i += 4) {
    imageData2.data[i] = 255; // Red channel
    imageData2.data[i + 1] = 0; // Green channel
    imageData2.data[i + 2] = 0; // Blue channel
    imageData2.data[i + 3] = 255; // Alpha channel
}

// Put the modified ImageData onto the canvas
ctx.putImageData(imageData2, 0, 0);