import React, { useEffect, useRef } from "react";

export interface FluidShaderCanvasProps {
  colors?: [string, string, string, string]; // 4 hex colors
  speed?: number;
  interactive?: boolean;
  className?: string;
}

// Convert Hex to RGB [r, g, b] (0..1)
function hexToVec3(hex: string): [number, number, number] {
  let clean = hex.replace("#", "");
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  const num = parseInt(clean, 16) || 0;
  return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
}

const VERTEX_SHADER_SOURCE = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SOURCE = `
precision highp float;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform vec3 u_color4;
varying vec2 vUv;

// Simplex Noise 2D
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  vec2 st = gl_FragCoord.xy / u_resolution.xy;
  st.x *= u_resolution.x / u_resolution.y;

  vec2 mouseUv = u_mouse / u_resolution.xy;
  mouseUv.x *= u_resolution.x / u_resolution.y;

  // Interactive mouse ripple displacement distance
  float distToMouse = length(st - mouseUv);
  float ripple = sin(distToMouse * 25.0 - u_time * 4.0) * exp(-distToMouse * 3.0);

  float t = u_time * 0.35;

  // Multi-octave domain warping for organic liquid fluid flow
  vec2 q = vec2(0.0);
  q.x = snoise(st + vec2(t * 0.4, t * 0.2) + ripple * 0.15);
  q.y = snoise(st + vec2(t * 0.3, -t * 0.5) + ripple * 0.15);

  vec2 r = vec2(0.0);
  r.x = snoise(st + 1.8 * q + vec2(1.7, 9.2) + 0.2 * t);
  r.y = snoise(st + 1.8 * q + vec2(8.3, 2.8) + 0.18 * t);

  float f = snoise(st + 2.4 * r + vec2(t * 0.15, t * 0.25));

  // Blend 4 vibrant colors based on liquid flow values
  float mix1 = clamp((f * f * 4.0), 0.0, 1.0);
  float mix2 = clamp(length(q), 0.0, 1.0);
  float mix3 = clamp(length(r.x), 0.0, 1.0);

  vec3 color = mix(u_color1, u_color2, mix1);
  color = mix(color, u_color3, mix2 * 0.75);
  color = mix(color, u_color4, mix3 * 0.6);

  // Add subtle glowing liquid ripple highlight at mouse location
  color += vec3(1.0, 0.9, 0.7) * max(0.0, ripple * 0.35);

  // Subtle film grain paper noise
  float grain = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.035;
  color += grain;

  gl_FragColor = vec4(color, 1.0);
}
`;

export const FluidShaderCanvas: React.FC<FluidShaderCanvasProps> = ({
  colors = ["#ff5e1a", "#f59e0b", "#d97706", "#78350f"],
  speed = 1.0,
  interactive = true,
  className = "w-full h-full"
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mousePosRef = useRef<[number, number]>([0.5, 0.5]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return;

    const createShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertShader = createShader(gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fragShader = createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
    if (!vertShader || !fragShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    const posLocation = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(posLocation);
    gl.vertexAttribPointer(posLocation, 2, gl.FLOAT, false, 0, 0);

    const uResLoc = gl.getUniformLocation(program, "u_resolution");
    const uMouseLoc = gl.getUniformLocation(program, "u_mouse");
    const uTimeLoc = gl.getUniformLocation(program, "u_time");
    const uCol1Loc = gl.getUniformLocation(program, "u_color1");
    const uCol2Loc = gl.getUniformLocation(program, "u_color2");
    const uCol3Loc = gl.getUniformLocation(program, "u_color3");
    const uCol4Loc = gl.getUniformLocation(program, "u_color4");

    const [r1, g1, b1] = hexToVec3(colors[0]);
    const [r2, g2, b2] = hexToVec3(colors[1]);
    const [r3, g3, b3] = hexToVec3(colors[2]);
    const [r4, g4, b4] = hexToVec3(colors[3]);

    gl.uniform3f(uCol1Loc, r1, g1, b1);
    gl.uniform3f(uCol2Loc, r2, g2, b2);
    gl.uniform3f(uCol3Loc, r3, g3, b3);
    gl.uniform3f(uCol4Loc, r4, g4, b4);

    let animationFrameId: number;
    let startTime = performance.now();

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvas || !interactive) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = rect.height - (e.clientY - rect.top);
      mousePosRef.current = [x, y];
    };

    window.addEventListener("mousemove", handleMouseMove);

    const resize = () => {
      if (!canvas) return;
      const displayWidth = canvas.clientWidth || 400;
      const displayHeight = canvas.clientHeight || 200;
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, displayWidth, displayHeight);
        gl.uniform2f(uResLoc, displayWidth, displayHeight);
      }
    };

    const render = (now: number) => {
      resize();
      const elapsed = ((now - startTime) / 1000) * speed;
      gl.uniform1f(uTimeLoc, elapsed);
      gl.uniform2f(uMouseLoc, mousePosRef.current[0], mousePosRef.current[1]);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      gl.deleteProgram(program);
    };
  }, [colors, speed, interactive]);

  return <canvas ref={canvasRef} className={`block rounded-3xl ${className}`} />;
};
