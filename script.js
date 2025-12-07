const canvas = document.getElementById('bg-canvas');
const gl = canvas.getContext('webgl');

if (!gl) {
    console.error('WebGL not supported');
}

let width, height;
let mouse = { x: 0.5, y: 0.5 };

// Vertex Shader
const vsSource = `
    attribute vec4 aVertexPosition;
    void main() {
        gl_Position = aVertexPosition;
    }
`;

// Fragment Shader (Liquid/Plasma - Reverted Pre-Aurora)
const fsSource = `
    precision highp float;
    
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform vec2 u_mouse;

    void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        uv = uv * 2.0 - 1.0;
        uv.x *= u_resolution.x / u_resolution.y;

        // Slow movement
        float t = u_time * 0.2;
        
        // Mouse influence
        vec2 m = u_mouse * 2.0 - 1.0;
        m.x *= u_resolution.x / u_resolution.y;
        float dist = length(uv - m);
        
        // Liquid warping
        vec2 p = uv;
        
        float a = 0.5; // Amplitude
        float f = 1.0; // Frequency
        
        // FBM-like layers
        for(int i = 0; i < 3; i++) {
            p.x += sin(p.y * f + t) * a;
            p.y += cos(p.x * f + t) * a;
            a *= 0.5;
            f *= 2.0;
        }
        
        // Mouse warp
        p += 0.1 / (dist + 0.2) * sin(t);

        // Color Palette: Subtle Blue / Purple / Grey
        // Reverting to the "Liquid" logic but using the subtle colors requested later
        
        // Base value from warping
        float val = sin(p.x * 3.0 + t);
        
        // Dark Base
        vec3 col = vec3(0.05, 0.05, 0.07); // Dark Grey
        
        // Colors
        vec3 blue = vec3(0.2, 0.3, 0.5); // Desaturated Blue
        vec3 purple = vec3(0.3, 0.2, 0.4); // Desaturated Purple
        vec3 grey = vec3(0.4, 0.45, 0.5); // Light Grey
        
        // Mix based on warping value
        vec3 mix1 = mix(blue, purple, p.y + 0.5);
        
        // Smooth stepping for fluid look
        float v = smoothstep(0.0, 1.0, val * 0.5 + 0.5);
        
        col = mix(col, mix1, v * 0.6); // Mix in color softly
        
        // Add subtle grey highlights
        col += grey * 0.1 * sin(p.y * 10.0 + t);
        
        // Vignette
        float vign = 1.0 - length(uv * 0.6);
        col *= smoothstep(0.0, 1.2, vign);

        gl_FragColor = vec4(col, 1.0);
    }
`;

function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }
    return shaderProgram;
}

function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

const programInfo = {
    program: shaderProgram,
    attribLocations: {
        vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
    },
    uniformLocations: {
        resolution: gl.getUniformLocation(shaderProgram, 'u_resolution'),
        time: gl.getUniformLocation(shaderProgram, 'u_time'),
        mouse: gl.getUniformLocation(shaderProgram, 'u_mouse'),
    },
};

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
const positions = [-1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0];
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    gl.viewport(0, 0, width, height);
}

function render(now) {
    now *= 0.001;

    gl.useProgram(programInfo.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    gl.uniform2f(programInfo.uniformLocations.resolution, width, height);
    gl.uniform1f(programInfo.uniformLocations.time, now);
    gl.uniform2f(programInfo.uniformLocations.mouse, mouse.x, mouse.y);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    requestAnimationFrame(render);
}

window.addEventListener('resize', resize);
window.addEventListener('mousemove', e => {
    mouse.x = e.clientX / width;
    mouse.y = 1.0 - (e.clientY / height);
});

resize();
requestAnimationFrame(render);
