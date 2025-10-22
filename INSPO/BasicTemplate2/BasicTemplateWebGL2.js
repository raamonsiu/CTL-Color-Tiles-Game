var gl = null;
var program;

var exampleTriangle = {
  "vertices" : [
    -0.7, -0.7, 0.0,
     0.7, -0.7, 0.0,
     0.0,  0.7, 0.0
  ]
};
var examplePentagon = {
    "vertices": [
        0.0,  0.7, 0.0,
        0.67, 0.22, 0.0,
        0.41, -0.57, 0.0,
        -0.41, -0.57, 0.0,
        -0.67, 0.22, 0.0
    ]
};

function getWebGLContext() {
  var canvas = document.getElementById("myCanvas");
  try {
    return canvas.getContext("webgl2");
  } catch(e) {}
  return null;
}

function initShaders() {
  var vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, document.getElementById('myVertexShader').text);
  gl.compileShader(vertexShader);

  var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, document.getElementById('myFragmentShader').text);
  gl.compileShader(fragmentShader);
  
  program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.useProgram(program);

  program.vertexPositionAttribute = gl.getAttribLocation(program, "VertexPosition");
  gl.enableVertexAttribArray(program.vertexPositionAttribute);
}

function initRendering() {
  gl.clearColor(0.0, 0.0, 1.0, 1.0);
}

function initBuffers(model) {
  model.idBufferVertices = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, model.idBufferVertices);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.vertices), gl.STATIC_DRAW);
}

function draw(model) {
  gl.bindBuffer(gl.ARRAY_BUFFER, model.idBufferVertices);
  gl.vertexAttribPointer(program.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);  //  Usar drawArrays
}

function drawScene() {
  gl.clear(gl.COLOR_BUFFER_BIT);
  draw(exampleTriangle);
}

function initWebGL() {
  gl = getWebGLContext();
  if (!gl) {
    alert("WebGL 2.0 no está disponible");
    return;
  }
  initShaders();
  initBuffers(exampleTriangle);
  initRendering();
  requestAnimationFrame(drawScene);
}

initWebGL();
