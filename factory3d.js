// Factory Twins V0.2 · visor 3D conceptual (datos exclusivamente simulados).
// Three.js se carga desde CDN; el plano 2D permanece disponible sin WebGL.
const host = document.getElementById('factory3d');
if (host) {
  (async () => {
    try {
      const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
      const {OrbitControls} = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js');
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x101d2b);
      scene.fog = new THREE.Fog(0x101d2b, 28, 72);
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
      camera.position.set(18,19,23);
      const renderer = new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
      renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.35;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.setAttribute('aria-label','Vista 3D interactiva de la planta industrial simulada');
      host.replaceChildren(renderer.domElement);
      const controls = new OrbitControls(camera,renderer.domElement);
      controls.target.set(0,1,0); controls.enableDamping=true; controls.maxPolarAngle=Math.PI/2.12;
      controls.minDistance=10; controls.maxDistance=48;
      scene.add(new THREE.HemisphereLight(0xa3d5ff,0x263643,2.0));
      const sun = new THREE.DirectionalLight(0xfff2d6,3.5);
      sun.position.set(-8,20,12); sun.castShadow=true;
      sun.shadow.mapSize.set(2048,2048);
      sun.shadow.camera.left=-25;sun.shadow.camera.right=25;sun.shadow.camera.top=25;sun.shadow.camera.bottom=-25;
      scene.add(sun);
      const mat=(color,metalness=0.3,roughness=0.5)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
      const floor=mat(0x344759,0.22,0.84),steel=mat(0x879eac,0.7,0.34),dark=mat(0x233d4e,0.65,0.42),light=mat(0xb7cbd2,0.32,0.49),belt=mat(0x233037,0.2,0.92);
      function block(parent,w,h,d,x,y,z,material,shadow=true){const obj=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);obj.position.set(x,y,z);obj.castShadow=shadow;obj.receiveShadow=true;parent.add(obj);return obj}
      const foundation=block(scene,27,.35,19,0,-.23,0,floor,false);
      block(scene,27,.1,.1,0,.08,-9.5,steel,false);
      block(scene,.1,.1,19,-13.5,.08,0,steel,false);
      block(scene,.1,.1,19,13.5,.08,0,steel,false);
      const grid=new THREE.GridHelper(27,27,0x4e7382,0x375469);grid.position.y=-.03;scene.add(grid);
      for(const x of [-12.7,0,12.7])for(const z of [-8.8,8.8]){block(scene,.18,4.4,.18,x,2.1,z,steel);block(scene,.34,.22,.34,x,4.35,z,light)}
      for(const z of [-8.8,8.8])block(scene,25.5,.15,.15,0,4.4,z,steel);
      for(const x of [-12.7,12.7])block(scene,.15,.15,17.5,x,4.4,0,steel);
      // Cinta de pasillo central
      const walkway=mat(0x556476,0.1,.8);block(scene,2.4,.025,18,0,.04,0,walkway,false);
      const safety=mat(0xe6b55a,.1,.65);
      for(const x of [-1.28,1.28])block(scene,.08,.03,18,x,.055,0,safety,false);
      const positions={M01:[-7,-5],M02:[-7,.4],M03:[7,-5],M04:[7,.4],M05:[-7,5.8],M06:[7,5.8]};
      const groups=new Map();const picks=[];
      const rotors=[];
      function cylinder(g,r1,r2,h,x,y,z,material,rotZ=0){const o=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,24),material);o.position.set(x,y,z);o.rotation.z=rotZ;o.castShadow=true;g.add(o);return o}
      function addMachine(m){
        const group=new THREE.Group();group.position.set(...[positions[m.id][0],0,positions[m.id][1]]);
        group.userData.machineId=m.id;scene.add(group);groups.set(m.id,group);
        const selectedColor=new THREE.MeshStandardMaterial({color:0x40d7c1,emissive:0x007766,emissiveIntensity:.1,roughness:.5,metalness:.32});
        block(group,5,.17,3.5,0,.12,0,dark);
        if(m.id==='M01'||m.id==='M05'){
          // Transportador en horizontal, rodillos y banda con paquete
          for(const x of [-1.95,1.95])for(const z of [-1.05,1.05])block(group,.16,1.1,.16,x,.73,z,steel);
          block(group,4.35,.24,2.3,0,1.3,0,belt);
          for(let i=-5;i<=5;i++)block(group,.07,.035,2.1,i*.38,1.45,0,steel);
          block(group,.55,.5,.65,.5,1.74,0,m.id==='M01'?mat(0xb9834e):selectedColor);
          block(group,4.35,.18,.12,0,1.59,1.15,safety);
        }else if(m.id==='M02'){
          cylinder(group,1.05,1.0,2.3,0,1.7,0,steel);
          cylinder(group,1.18,1.18,.18,0,2.93,0,dark);
          cylinder(group,.23,.23,.8,0,3.45,0,dark);
          const shaft=cylinder(group,.08,.08,1,0,2.3,0,safety);rotors.push({o:shaft,speed:.02});
          block(group,.75,.95,.65,1.8,.85,0,dark);
          block(group,.5,.2,.5,1.8,1.42,0,selectedColor);
        }else if(m.id==='M03'||m.id==='M04'){
          const cold=mat(0xb8d6de,.2,.38);
          block(group,4.55,3.1,3.1,0,1.77,0,cold);
          block(group,1.35,2.38,.08,-.98,1.67,1.61,dark);
          block(group,1.35,2.38,.08,.98,1.67,1.61,dark);
          for(const x of [-1.98,1.98])block(group,.14,3.0,.15,x,1.76,1.64,steel);
          for(let x=-1.4;x<=1.5;x+=1.4){const fan=cylinder(group,.5,.5,.12,x,3.45,-.4,dark);rotors.push({o:fan,speed:.015})}
          block(group,.55,.23,.07,1.78,1.66,1.69,selectedColor);
        }else if(m.id==='M06'){
          cylinder(group,.76,.76,3.4,0,1.28,0,steel,Math.PI/2);
          for(const x of [-1.35,1.35])cylinder(group,.85,.85,.12,x,1.28,0,dark,Math.PI/2);
          block(group,1.1,1.1,1.15,0,2.55,0,dark);
          block(group,.88,.13,.76,0,3.16,0,selectedColor);
        }
        // Hover/status column
        const lamp=cylinder(group,.22,.22,.11,2.2,2.75,1.4,safety);
        cylinder(group,.05,.05,1.1,2.2,2.15,1.4,steel);
        group.userData.indicator=lamp;
        group.traverse(o=>{if(o.isMesh){o.userData.machineId=m.id;picks.push(o)}});
      }
      const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
      renderer.domElement.addEventListener('click',e=>{
        const r=renderer.domElement.getBoundingClientRect();if(!r.width||!r.height)return;
        pointer.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);
        raycaster.setFromCamera(pointer,camera);
        const hit=raycaster.intersectObjects(picks,false)[0];
        if(hit&&window.FactoryTwinsSelect)window.FactoryTwinsSelect(hit.object.userData.machineId);
      });
      let selected='M04';
      function sync(){
        const d=window.FactoryTwinsData?.();if(!d)return;
        selected=d.selected;
        for(const m of d.items){const g=groups.get(m.id);if(!g)continue;
          const state=d.status(m);const color=state==='warn'?0xffbb57:state==='off'?0x8293a5:0x4de5ba;
          g.userData.indicator.material.color.setHex(color);
          g.userData.indicator.material.emissive=new THREE.Color(color);
          g.userData.indicator.material.emissiveIntensity=.4;
          const halo=g.userData.halo;if(halo){halo.visible=m.id===selected}
        }
      }
      const halos=new THREE.MeshBasicMaterial({color:0x35edda,transparent:true,opacity:.7,side:THREE.DoubleSide});
      const init=window.FactoryTwinsData?.();if(init){for(const m of init.items){addMachine(m);const group=groups.get(m.id);const halo=new THREE.Mesh(new THREE.RingGeometry(2.7,2.86,64),halos);halo.rotation.x=-Math.PI/2;halo.position.y=.23;group.add(halo);group.userData.halo=halo;}}
      window.addEventListener('factorytwins:update',sync);sync();
      const resize=()=>{
        const w=host.clientWidth,h=host.clientHeight;
        if(w<1||h<1)return;
        camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);
      };
      const observer=new ResizeObserver(resize);observer.observe(host);
      let previous=0,animationId=0,disposed=false;
      function frame(t){
        if(disposed)return;
        animationId=requestAnimationFrame(frame);
        // Explicitly inspect the host: hidden parent and 2D mode are both supported.
        if(document.hidden||host.hidden||!host.isConnected||host.getClientRects().length===0){
          previous=0;return;
        }
        const dt=previous?Math.min((t-previous)/16.67,3):1;previous=t;
        if(!window.FactoryTwinsData?.()?.paused){
          for(const rotor of rotors)rotor.o.rotation.y+=rotor.speed*dt;
        }
        controls.update();renderer.render(scene,camera);
      }
      animationId=requestAnimationFrame(frame);
      const resetView=()=>{camera.position.set(18,19,23);controls.target.set(0,1,0);controls.update()};
      const topView=()=>{camera.position.set(0,32,.01);controls.target.set(0,0,0);controls.update()};
      document.getElementById('viewReset')?.addEventListener('click',resetView);
      document.getElementById('viewTop')?.addEventListener('click',topView);
      const cleanup=()=>{
        if(disposed)return;
        disposed=true;cancelAnimationFrame(animationId);observer.disconnect();
        window.removeEventListener('factorytwins:update',sync);
        document.getElementById('viewReset')?.removeEventListener('click',resetView);
        document.getElementById('viewTop')?.removeEventListener('click',topView);
        controls.dispose();
        const geometries=new Set(),materials=new Set();
        scene.traverse(object=>{
          if(object.geometry)geometries.add(object.geometry);
          if(object.material){
            for(const material of (Array.isArray(object.material)?object.material:[object.material]))materials.add(material);
          }
        });
        for(const geometry of geometries)geometry.dispose();
        for(const material of materials)material.dispose();
        renderer.dispose();
      };
      window.addEventListener('pagehide',cleanup,{once:true});
      const hint=document.getElementById('3dloading');if(hint)hint.remove();
    }catch(err){
      console.error('Factory Twins 3D:',err);
      const note=document.getElementById('3dloading');if(note)note.textContent='No fue posible cargar Three.js o WebGL. Puedes utilizar la vista 2D.';
      document.getElementById('view2d')?.click();
    }
  })();
}
