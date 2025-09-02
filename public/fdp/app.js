// Minimal FDP letters (F & P normaal, D half-hoog), slank & lichte yaw
const COLORS = { gold:"#d4af37", goldDeep:"#b8860b", white:"#ffffff" };

const el = document.getElementById("scene");
const scene = new THREE.Scene();
scene.background = new THREE.Color(COLORS.white);

const camera = new THREE.PerspectiveCamera(40, el.clientWidth/el.clientHeight, 0.1, 2000);
camera.position.set(0, 2.2, 18);

const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(el.clientWidth, el.clientHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
el.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0xffffff, 0.55));
const key = new THREE.DirectionalLight(0xffffff, 1.0); key.position.set(8,10,6); scene.add(key);
const fill= new THREE.DirectionalLight(0xffffff, 0.55); fill.position.set(-6,4,8); scene.add(fill);

const matGold = new THREE.MeshPhysicalMaterial({ color:new THREE.Color(COLORS.gold), metalness:1, roughness:0.25, clearcoat:0.6, clearcoatRoughness:0.15 });
const matGoldDeep = matGold.clone(); matGoldDeep.color = new THREE.Color(COLORS.goldDeep);

const loader = new THREE.FontLoader();
loader.load("https://cdn.jsdelivr.net/npm/three@0.128.0/examples/fonts/helvetiker_regular.typeface.json", (font)=>{
  const mk = (ch, size, mat)=>{
    const geo = new THREE.TextGeometry(ch,{
      font, size, height:0.9,
      curveSegments:6, bevelEnabled:true, bevelThickness:0.12,
      bevelSize:Math.min(0.18,size*0.065), bevelSegments:4
    });
    geo.computeBoundingBox();
    const m = new THREE.Mesh(geo, mat);
    const bb = geo.boundingBox; m.position.y = -bb.min.y;
    return { mesh:m, w:bb.max.x - bb.min.x };
  };

  const sizeFP=2.8, sizeD=sizeFP*0.5;
  const F=mk("F",sizeFP,matGold), D=mk("D",sizeD,matGoldDeep), P=mk("P",sizeFP,matGold);

  const g = new THREE.Group();
  let x=0;
  F.mesh.position.x=x; x+=F.w+0.22;   // F iets dichter bij D
  D.mesh.position.x=x; x+=D.w+0.38;   // D wat verder van P
  P.mesh.position.x=x;

  g.add(F.mesh,D.mesh,P.mesh);

  const totalW = F.w + D.w + P.w + 0.22 + 0.38;
  g.position.set(-totalW/2, -0.6, 0);
  g.scale.set(0.83,1,1);      // iets slanker
  g.rotation.y = -0.22;       // lichte yaw
  scene.add(g);
});

function onResize(){
  const w=el.clientWidth, h=el.clientHeight;
  camera.aspect = w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h);
}
window.addEventListener("resize", onResize);

(function loop(){ renderer.render(scene,camera); requestAnimationFrame(loop); })();
