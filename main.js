// Register GSAP ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

/* ==========================================================================
   GLOBAL VARIABLES & STATE
   ========================================================================== */
const state = {
  scrollProgress: 0,
  scrollVelocity: 0,
  mouseX: 0,
  mouseY: 0,
  targetMouseX: 0,
  targetMouseY: 0,
  warpFactor: 1.0,
  warpFactorDisplay: 1.0,
  currentDepth: 0,
  maxDepth: 12.5 // Light years
};

/* ==========================================================================
   CUSTOM HOLOGRAPHIC CURSOR
   ========================================================================== */
const cursorDot = document.getElementById('cursor-dot');
const cursorFollower = document.getElementById('cursor-follower');

const cursorX = gsap.quickTo(cursorFollower, "x", { duration: 0.3, ease: "power3.out" });
const cursorY = gsap.quickTo(cursorFollower, "y", { duration: 0.3, ease: "power3.out" });
const dotX = gsap.quickTo(cursorDot, "x", { duration: 0.05, ease: "power3.out" });
const dotY = gsap.quickTo(cursorDot, "y", { duration: 0.05, ease: "power3.out" });

window.addEventListener('mousemove', (e) => {
  state.targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;
  state.targetMouseY = (e.clientY / window.innerHeight) * 2 - 1;
  
  cursorX(e.clientX);
  cursorY(e.clientY);
  dotX(e.clientX);
  dotY(e.clientY);
});

// Cursor Hover States
const hoverTargets = document.querySelectorAll('a, button, .hud-btn, .glass-card, .skill-chip');
hoverTargets.forEach(target => {
  target.addEventListener('mouseenter', () => {
    document.body.classList.add('cursor-hover');
  });
  target.addEventListener('mouseleave', () => {
    document.body.classList.remove('cursor-hover');
  });
});

/* ==========================================================================
   THREE.JS DEBRIS FIELD FIELD
   ========================================================================== */
let scene, camera, renderer;
let debrisGroup, starField;
const debrisCount = 450;
const debrisMeshes = [];

function initThree() {
  const canvas = document.getElementById('space-canvas');
  
  // Scene Setup
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050508, 0.007);
  
  // Camera Setup
  camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 30;
  
  // Renderer Setup
  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  
  // Lights
  const ambientLight = new THREE.AmbientLight(0x1a237e, 0.6); // Deep space blue ambient
  scene.add(ambientLight);
  
  const blueLight = new THREE.PointLight(0x00e5ff, 2.5, 120); // Bright cyan light
  blueLight.position.set(20, 20, 20);
  scene.add(blueLight);
  
  const purpleLight = new THREE.PointLight(0x7c4dff, 2.0, 100); // Purple light
  purpleLight.position.set(-20, -20, 10);
  scene.add(purpleLight);

  // Group for particles
  debrisGroup = new THREE.Group();
  scene.add(debrisGroup);
  
  // Geometries for space debris
  const geometries = [
    new THREE.BoxGeometry(0.12, 0.12, 0.12),
    new THREE.TetrahedronGeometry(0.12),
    new THREE.OctahedronGeometry(0.12),
    new THREE.IcosahedronGeometry(0.08)
  ];
  
  // Material for space debris (metallic, reflective space look)
  const debrisMaterial = new THREE.MeshPhongMaterial({
    color: 0x88b0ff,
    shininess: 90,
    specular: 0x00e5ff,
    flatShading: true
  });
  
  // Generate Debris Meshes
  for (let i = 0; i < debrisCount; i++) {
    const geo = geometries[Math.floor(Math.random() * geometries.length)];
    const mesh = new THREE.Mesh(geo, debrisMaterial);
    
    // Position within a 3D box range around camera
    mesh.position.set(
      THREE.MathUtils.randFloatSpread(120),
      THREE.MathUtils.randFloatSpread(80),
      THREE.MathUtils.randFloatSpread(250) - 80 // Spread deep into the background
    );
    
    // Random scale, rotation
    const scale = THREE.MathUtils.randFloat(0.5, 3.0);
    mesh.scale.set(scale, scale, scale);
    mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    
    // Store drift speeds & offsets for zero-gravity simulation
    mesh.userData = {
      spinX: THREE.MathUtils.randFloat(-0.005, 0.005),
      spinY: THREE.MathUtils.randFloat(-0.005, 0.005),
      driftSpeed: THREE.MathUtils.randFloat(0.02, 0.1),
      driftOffset: Math.random() * Math.PI * 2
    };
    
    debrisGroup.add(mesh);
    debrisMeshes.push(mesh);
  }
  
  // Create micro background stars (stars dust)
  const starGeo = new THREE.BufferGeometry();
  const starCount = 1800;
  const starPositions = new Float32Array(starCount * 3);
  
  for (let i = 0; i < starCount * 3; i += 3) {
    starPositions[i] = THREE.MathUtils.randFloatSpread(200);
    starPositions[i+1] = THREE.MathUtils.randFloatSpread(150);
    starPositions[i+2] = THREE.MathUtils.randFloatSpread(400) - 200;
  }
  
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  
  const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.06,
    transparent: true,
    opacity: 0.8
  });
  
  starField = new THREE.Points(starGeo, starMaterial);
  scene.add(starField);
}

// Window resizing
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ==========================================================================
   GSAP 3D SCROLL TIMELINE (MOVING THROUGH SPACE)
   ========================================================================== */
function initScrollStory() {
  const sections = gsap.utils.toArray('.space-section');
  const sectionsContainer = document.getElementById('sections-container');
  
  // Clean initialization values in CSS style for 3D translations
  gsap.set(sections, { z: -1500, opacity: 0, visibility: 'hidden' });
  
  // Setup Master ScrollTrigger Timeline
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ".scroll-wrapper",
      start: "top top",
      end: "bottom bottom",
      scrub: 1.2,
      onUpdate: (self) => {
        state.scrollProgress = self.progress;
        state.scrollVelocity = Math.abs(self.getVelocity());
      }
    }
  });

  // Section 0 (Hero) starts in focus
  gsap.set(sections[0], { z: 0, opacity: 1, visibility: 'visible' });

  // 1. HERO flies out (towards camera)
  tl.to(sections[0], {
    z: 700,
    opacity: 0,
    visibility: 'hidden',
    duration: 1.5,
    ease: "power2.in"
  }, 0);

  // 2. ABOUT floats in from Left / Deep Z and slides out to front
  tl.fromTo(sections[1], 
    { x: -500, z: -1200, rotationY: -45, opacity: 0, visibility: 'hidden' },
    { 
      x: 0, z: 0, rotationY: 0, opacity: 1, visibility: 'visible',
      duration: 1.5, ease: "power2.out"
    }, 
    0.8
  );
  
  tl.to(sections[1], {
    x: 300,
    z: 700,
    rotationY: 25,
    opacity: 0,
    visibility: 'hidden',
    duration: 1.5,
    ease: "power2.in"
  }, 2.5);

  // 3. PROJECTS orbits in from Bottom / Deep Z
  tl.fromTo(sections[2],
    { y: 400, z: -1200, rotationX: 35, opacity: 0, visibility: 'hidden' },
    {
      y: 0, z: 0, rotationX: 0, opacity: 1, visibility: 'visible',
      duration: 1.5, ease: "power2.out"
    },
    3.3
  );

  tl.to(sections[2], {
    y: -400,
    z: 700,
    rotationX: -35,
    opacity: 0,
    visibility: 'hidden',
    duration: 1.5,
    ease: "power2.in"
  }, 5.0);

  // 4. SKILLS floats in from Right / Deep Z
  tl.fromTo(sections[3],
    { x: 500, z: -1200, rotationY: 45, opacity: 0, visibility: 'hidden' },
    {
      x: 0, z: 0, rotationY: 0, opacity: 1, visibility: 'visible',
      duration: 1.5, ease: "power2.out"
    },
    5.8
  );

  tl.to(sections[3], {
    z: 800,
    opacity: 0,
    visibility: 'hidden',
    duration: 1.5,
    ease: "power2.in"
  }, 7.5);

  // 5. ACHIEVEMENTS slides in from Top-Right
  tl.fromTo(sections[4],
    { x: 300, y: -300, z: -1200, rotation: -10, opacity: 0, visibility: 'hidden' },
    {
      x: 0, y: 0, z: 0, rotation: 0, opacity: 1, visibility: 'visible',
      duration: 1.5, ease: "power2.out"
    },
    8.3
  );

  tl.to(sections[4], {
    x: -400,
    z: 700,
    rotation: 15,
    opacity: 0,
    visibility: 'hidden',
    duration: 1.5,
    ease: "power2.in"
  }, 10.0);

  // 6. CONTACT slides straight out of depth
  tl.fromTo(sections[5],
    { z: -1500, opacity: 0, visibility: 'hidden' },
    {
      z: 0, opacity: 1, visibility: 'visible',
      duration: 1.5, ease: "power2.out"
    },
    10.8
  );
  
  // Ensure visibility pointers toggle appropriately
  sections.forEach((section, index) => {
    ScrollTrigger.create({
      trigger: ".scroll-wrapper",
      start: `${(index / sections.length) * 100}% top`,
      end: `${((index + 1) / sections.length) * 100}% top`,
      onToggle: self => {
        if (self.isActive) {
          section.classList.add('active');
        } else {
          section.classList.remove('active');
        }
      }
    });
  });
}

/* ==========================================================================
   ZERO-GRAVITY PANEL DRIFT TIMELINES (GSAP LOOPS)
   ========================================================================== */
function initZeroGDrift() {
  // Hero Name Char entry animation
  gsap.from(".hero-name .char", {
    opacity: 0,
    y: "random(-100, 100)",
    x: "random(-80, 80)",
    z: "random(-200, 50)",
    rotation: "random(-45, 45)",
    duration: 2.5,
    stagger: 0.05,
    ease: "power4.out"
  });

  // Hero subtitle stagger
  gsap.from(".subtitle-word", {
    opacity: 0,
    y: 30,
    duration: 1.8,
    delay: 1.0,
    stagger: 0.2,
    ease: "power3.out"
  });

  // Persistent floating loops for main panel cards
  const floatCards = document.querySelectorAll('.glass-card');
  floatCards.forEach((card, index) => {
    gsap.to(card, {
      y: "random(-18, 18)",
      x: "random(-10, 10)",
      rotationZ: "random(-1.5, 1.5)",
      rotationY: "random(-3, 3)",
      rotationX: "random(-3, 3)",
      duration: gsap.utils.random(6.5, 9.5),
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      delay: index * 0.4
    });
  });

  // Skills chips micro drift (each drifts independently)
  const chips = document.querySelectorAll('.skill-chip');
  chips.forEach((chip, index) => {
    const depth = parseFloat(chip.getAttribute('data-depth')) || 0.1;
    gsap.to(chip, {
      y: `random(-${depth * 150}, ${depth * 150})`,
      x: `random(-${depth * 100}, ${depth * 100})`,
      rotation: "random(-8, 8)",
      duration: gsap.utils.random(5.0, 8.0),
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      delay: index * 0.15
    });
  });
}

/* ==========================================================================
   HUD METRIC AND INTERACTIVE UPDATES
   ========================================================================== */
const hudCoords = document.getElementById('hud-coords');
const hudDepth = document.getElementById('hud-depth');
const hudWarpFactor = document.getElementById('warp-factor');
const scrollProgressBar = document.getElementById('scroll-progress-bar');

function updateHUDMetrics(time) {
  // 1. Coordinates drift + Scroll updates
  const coordX = (state.mouseX * 12.5 + Math.sin(time * 0.5) * 2.5).toFixed(2);
  const coordY = (state.mouseY * 12.5 + Math.cos(time * 0.6) * 2.5).toFixed(2);
  const coordZ = (state.scrollProgress * 4200.0 + Math.sin(time * 0.2) * 50).toFixed(2);
  
  hudCoords.textContent = `X: ${coordX} | Y: ${coordY} | Z: ${coordZ}`;
  
  // 2. Depth simulation
  state.currentDepth = (state.scrollProgress * state.maxDepth).toFixed(2);
  hudDepth.textContent = `${state.currentDepth} LY`;
  
  // 3. Warp factor velocity calculations
  // High scroll velocity triggers speed scale
  const speedTarget = 1.0 + (state.scrollVelocity * 0.0075);
  state.warpFactor += (speedTarget - state.warpFactor) * 0.08;
  
  hudWarpFactor.textContent = `${state.warpFactor.toFixed(2)}c`;
  
  // 4. Scroll progress bar
  scrollProgressBar.style.width = `${state.scrollProgress * 100}%`;
}

/* ==========================================================================
   RENDER ANIMATION LOOP
   ========================================================================== */
let clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  
  const time = clock.getElapsedTime();
  const delta = clock.getDelta();
  
  // Linear interpolation for mouse coordinates for smooth lag-effect
  state.mouseX += (state.targetMouseX - state.mouseX) * 0.05;
  state.mouseY += (state.targetMouseY - state.mouseY) * 0.05;
  
  // Parallax: Rotate camera slightly based on mouse
  camera.rotation.y = -state.mouseX * 0.06;
  camera.rotation.x = -state.mouseY * 0.06;
  
  // Move camera forward through debris based on scroll
  camera.position.z = 30 - (state.scrollProgress * 100);
  
  // Debris field dynamic movement
  debrisMeshes.forEach(mesh => {
    // 1. Slow rotation
    mesh.rotation.x += mesh.userData.spinX;
    mesh.rotation.y += mesh.userData.spinY;
    
    // 2. Wave-like floating drift
    const offset = mesh.userData.driftOffset;
    mesh.position.y += Math.sin(time * 0.8 + offset) * 0.0008;
    mesh.position.x += Math.cos(time * 0.6 + offset) * 0.0005;
    
    // 3. Warp speed stretch effect on z-axis (elongate when warp speed goes up)
    if (state.warpFactor > 1.8) {
      mesh.scale.z = (1 + (state.warpFactor - 1) * 0.25) * (mesh.scale.x);
    } else {
      mesh.scale.z = mesh.scale.x; // reset
    }
  });
  
  // Slow orbit of entire particle scene
  debrisGroup.rotation.z = time * 0.004;
  debrisGroup.rotation.y = time * 0.002;
  
  // Micro stars rotation
  if (starField) {
    starField.rotation.y = time * 0.001;
  }
  
  // Update dashboard overlays
  updateHUDMetrics(time);
  
  renderer.render(scene, camera);
}

/* ==========================================================================
   INITIALIZATION CALLS
   ========================================================================== */
window.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize WebGL Scene
  initThree();
  
  // 2. Initialize VanillaTilt (Tilt physics on Cards)
  if (typeof VanillaTilt !== 'undefined') {
    VanillaTilt.init(document.querySelectorAll("[data-tilt]"), {
      max: 10,
      speed: 600,
      glare: true,
      "max-glare": 0.15,
      gyroscope: true
    });
  }
  
  // 3. Initialize Scroll Animations
  initScrollStory();
  
  // 4. Initialize Zero-G Drifting Loops
  initZeroGDrift();
  
  // 5. Start Frame Loop
  animate();
});
