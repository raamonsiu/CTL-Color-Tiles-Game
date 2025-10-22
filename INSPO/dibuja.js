var gl, program, colorUniform;

const GREEN = [0.0, 1.0, 0.0];
const RED = [1.0, 0.0, 0.0];

var currentTriangleColors = {
  exampleTriangle: GREEN,
  exampleTriangle2: GREEN,
  exampleTriangle3: GREEN
};

var exampleTriangle = {
  "vertices":
    [
      -0.7, 0.3, 0,
      0, 0.3, 0,
      -0.35, 0.7, 0
    ],
  "indices": [0, 1, 2],
  "name": "exampleTriangle"
};
var exampleTriangle2 = {
  "vertices":
    [
      0, 0.3, 0,
      0.7, 0.3, 0,
      0.35, 0.7, 0
    ],
  "indices": [0, 1, 2],
  "name": "exampleTriangle2"
};
var exampleTriangle3 = {
  "vertices":
    [
      -0.35, -0.1, 0,
      0.35, -0.1, 0,
      0, 0.3, 0
    ],
  "indices": [0, 1, 2],
  "name": "exampleTriangle3"
};

// WEBGL

function getWebGLContext() {
  var canvas = document.getElementById("myCanvas");
  try {
    return canvas.getContext("webgl2");
  }
  catch (e) {
    return null;
  }
}

function initShaders() {
  var vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, document.getElementById("myVertexShader").text);
  gl.compileShader(vertexShader);

  var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, document.getElementById("myFragmentShader").text);
  gl.compileShader(fragmentShader);

  program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.useProgram(program);

  program.vertexPositionAttribute = gl.getAttribLocation(program, "VertexPosition");
  gl.enableVertexAttribArray(program.vertexPositionAttribute);

  // Color uniform
  colorUniform = gl.getUniformLocation(program, "myColor");
  console.log("ColorUniform value:", colorUniform);
}

function initBuffers(model) {
  model.idBufferVertices = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, model.idBufferVertices);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.vertices), gl.STATIC_DRAW);
  model.idBufferIndices = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.idBufferIndices);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(model.indices), gl.STATIC_DRAW);
}

function initRendering() {
  gl.clearColor(0.15, 0.15, 0.15, 1.0);
}

function isInsideShader(mouseX, mouseY, shader) {
  var x = (mouseX / gl.canvas.width) * 2 - 1;
  var y = -(mouseY / gl.canvas.height) * 2 + 1;

  var v0 = [shader.vertices[0], shader.vertices[1]];
  var v1 = [shader.vertices[3], shader.vertices[4]];
  var v2 = [shader.vertices[6], shader.vertices[7]];

  // Detect if point is inside triangle 
  function sign(p1, p2, p3) {
    return (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1]); // True if p1 is on the left of the line p2p3
  }

  var d1 = sign([x, y], v0, v1);
  var d2 = sign([x, y], v1, v2);
  var d3 = sign([x, y], v2, v0);

  var hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
  var hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);

  return !(hasNeg && hasPos);
}

function changeColor(triangleName, red, green, blue) {
  currentTriangleColors[triangleName] = [red, green, blue];
  drawScene();  // Draw again with new color
}

// Function to manage clicks (now only to change color)
function click(event) {
  stringToLog = "Click at " + event.clientX + "," + event.clientY;
  var rect = gl.canvas.getBoundingClientRect();
  var mouseX = event.clientX - rect.left;
  var mouseY = event.clientY - rect.top;

  function invertColorOfTriangle(triangleName) {
    var current = currentTriangleColors[triangleName];
    currentTriangleColors[triangleName] =
      (current === GREEN || current[1] === 1.0) ? RED : GREEN;
    console.info("Changing color of " + triangleName + " to " + (current === GREEN ? "RED" : "GREEN"));
    drawScene();
  }

  if (isInsideShader(mouseX, mouseY, exampleTriangle)) {
    stringToLog += " - Inside triangle 1";
    invertColorOfTriangle("exampleTriangle");
  } else if (isInsideShader(mouseX, mouseY, exampleTriangle2)) {
    stringToLog += " - Inside triangle 2";
    invertColorOfTriangle("exampleTriangle2");
  } else if (isInsideShader(mouseX, mouseY, exampleTriangle3)) {
    stringToLog += " - Inside triangle 3";
    invertColorOfTriangle("exampleTriangle3");
  } else {
    stringToLog += " - Outside triangles";
  }
  console.info(stringToLog);
}

function draw(model) {
  var color = currentTriangleColors[model.name];
  gl.uniform4f(colorUniform, color[0], color[1], color[2], 1.0);

  var testValue = new Float32Array(4);
  gl.getUniform(program, colorUniform, testValue);

  gl.bindBuffer(gl.ARRAY_BUFFER, model.idBufferVertices);
  gl.vertexAttribPointer(program.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.idBufferIndices);
  gl.drawElements(gl.TRIANGLES, 3, gl.UNSIGNED_SHORT, 0);
}

function drawScene() {
  gl.clear(gl.COLOR_BUFFER_BIT);
  draw(exampleTriangle);
  draw(exampleTriangle2);
  draw(exampleTriangle3);
}

function initWebGL() {
  gl = getWebGLContext();
  if (!gl) {
    alert("WebGL 2.0 no está disponible");
    return;
  }

  gl.canvas.addEventListener('click', click);


  initShaders();
  initBuffers(exampleTriangle);
  initBuffers(exampleTriangle2);
  initBuffers(exampleTriangle3);
  initRendering();
  requestAnimationFrame(drawScene);
}
initWebGL();
