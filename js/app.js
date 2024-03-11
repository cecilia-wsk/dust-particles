import * as THREE from "three";
import Stats from "stats.js"; 
import fragment from "./shader/fragment.glsl";
import vertex from "./shader/vertex.glsl";
import simFragment from "./shader/sim-fragment.glsl";
import simVertex from "./shader/sim-vertex.glsl";
import FBO from './FBO';
import * as dat from "dat.gui";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';

export default class Sketch {
	
	constructor(options) {
		this.scene = new THREE.Scene();

        // Create a new instance of the Stats object
        // this.stats = new Stats();
        // this.stats.showPanel(0); // 0: FPS panel, 1: MS (Milliseconds) panel, 2: MB (Megabytes) panel
        // document.body.appendChild(this.stats.dom);

		this.clock = new THREE.Clock();

		this.width = window.innerWidth;
		this.height = window.innerHeight;

		this.renderer = new THREE.WebGLRenderer({
			antialias: true,
			alpha: true
		});

		this.renderer.setSize( this.width , this.height )
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
		this.renderer.setClearColor(0x000000, 1);

		this.raycaster = new THREE.Raycaster();
		this.pointer = new THREE.Vector2();

		this.container = document.getElementById("webgl");
		this.container.appendChild(this.renderer.domElement);

		this.speed = 0;
		this.targetSpeed = 0;
		this.mouse = new THREE.Vector2();
		this.followMouse = new THREE.Vector2();
		this.prevMouse = new THREE.Vector2();

		this.paused = false;

		this.settings();
		this.addCamera();
		// this.composerPass();
		this.setupEvents();
		this.setupFBO();
		this.addObjects();
		//this.addControls();
		// this.createMesh();
		this.resize();
		this.render();

		window.addEventListener('mousemove', (event) => {
			this.mouseMouve(event);
		});

		window.addEventListener('resize', (event) => {
			this.resize(event);
		});

	}

	settings = () => {
		this.settings = {
			velo: 0,
			scale: 0,
		};
	}

	addCamera = () => {
		// this.camera = new THREE.PerspectiveCamera(
		// 	75,
		// 	this.width/this.height,
		// 	0.001,
		// 	1000
		// );
		this.camera =  new THREE.OrthographicCamera( this.width / - 450, this.width / 450, this.height / 450, this.height / - 450, -1, 1 );

		this.camera.position.set(0, 0, 2);
		this.camera.lookAt(0, 0, 0);
		this.scene.add(this.camera);
	}

	getRenderTarget = () => {
		const renderTarget = new THREE.WebGLRenderTarget( this.width, this.height, {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat,
			type: THREE.FloatType 
		})
		return renderTarget;
	}

	setupEvents = () => {
		this.dummy = new THREE.Mesh(
			new THREE.PlaneGeometry(100,100),
			new THREE.MeshBasicMaterial()
		)
		// this.ball = new THREE.Mesh(
		// 	new THREE.SphereGeometry(0.1, 32, 32),
		// 	new THREE.MeshBasicMaterial({ color: 0xffffff })
		// )
		//this.scene.add(this.ball);
		window.addEventListener('pointermove', (event) => {
			this.pointer.x = (event.clientX / this.width)*2-1;
			this.pointer.y = - (event.clientY / this.height)*2+1;
			this.raycaster.setFromCamera(this.pointer, this.camera);
			let intersects = this.raycaster.intersectObject(this.dummy);
			if (intersects.length > 0) {
				let {x,y} = intersects[0].point;
				this.fboMaterial.uniforms.uMouse.value = new THREE.Vector2(x,y);
			}
		});	
	}

	setupFBO = () => {
		this.size = 126*3;
		this.fbo = this.getRenderTarget();
		this.fbo1 = this.getRenderTarget();

		this.fboScene = new THREE.Scene();
		this.fboCamera = new THREE.OrthographicCamera(-1,1,1,-1,-1,1);
		this.fboCamera.position.set(0,0,0.5);
		this.fboCamera.lookAt(0,0,0);
		let geometry = new THREE.PlaneGeometry(2,2);

		this.data = new Float32Array(this.size*this.size*4);

		for(let i = 0; i < this.size ; i++) {
			for(let j = 0; j < this.size ; j++) {
				let index = (i+j*this.size)*4;
				let theta = Math.random() * Math.PI * 2;
				let r = 0.5 + Math.random();
				this.data[index+0] = r;
				this.data[index+1] = r;
				this.data[index+2] = 1.;
				this.data[index+3] = 1.;
			}
		}

		this.fboTexture = new THREE.DataTexture( this.data, this.size, this.size, THREE.RGBAFormat, THREE.FloatType);
		this.fboTexture.magFilter = THREE.NearestFilter;
		this.fboTexture.minFilter = THREE.NearestFilter;
		this.fboTexture.needsUpdate = true;

		this.fboMaterial = new THREE.ShaderMaterial({
			uniforms: {
				uPositions: { value: this.fboTexture },
				uInfos: { value: null },
				uTime: { value: 0},
				uMouse: { value: new THREE.Vector2(0,0) }
			}, 
			vertexShader: simVertex,
			fragmentShader: simFragment
		})

		this.infosArray = new Float32Array(this.size*this.size*4);

		for(let i = 0; i < this.size ; i++) {
			for(let j = 0; j < this.size ; j++) {
				let index = (i+j*this.size)*4;
				this.infosArray[index+0] = 0.5 + Math.random();
				this.infosArray[index+1] = 0.5 + Math.random();
				this.infosArray[index+2] = 1.;
				this.infosArray[index+3] = 1.;
			}
		}

		this.infos = new THREE.DataTexture( this.infosArray, this.size, this.size, THREE.RGBAFormat, THREE.FloatType);
		this.infos.magFilter = THREE.NearestFilter;
		this.infos.minFilter = THREE.NearestFilter;
		this.infos.needsUpdate = true;
		this.fboMaterial.uniforms.uInfos.value = this.infos;


		this.fboMesh = new THREE.Mesh(geometry, this.fboMaterial);
		this.fboScene.add(this.fboMesh);

		this.renderer.setRenderTarget(this.fbo);
		this.renderer.render(this.fboScene, this.fboCamera);
		this.renderer.setRenderTarget(this.fbo1);
		this.renderer.render(this.fboScene, this.fboCamera);
	}

	mouseMouve = (event) => {
		this.mouse.x = ( event.clientX / this.width ) ;
		this.mouse.y = 1. - ( event.clientY/ this.height );
	}

	resize = () => {
		this.width = window.innerWidth;
		this.height = window.innerHeight;
    	// Update camera
		this.camera.aspect = this.width / this.height;

		this.camera.left = this.width / -450;
		this.camera.right = this.width / 450;
		this.camera.top = this.height / 450;
		this.camera.bottom = this.height / -450;
	
		this.camera.updateProjectionMatrix();
		// Update renderer
		this.renderer.setSize(this.width, this.height);
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
		//this.keepImageAspectRatio();
	}

	keepImageAspectRatio = (object) => {
		// image cover
		let imageAspect = object.iHeight / object.iWidth;
		let a1;
		let a2;

		if (object.height / object.width > imageAspect) {
			a1 = (object.width / object.height) * imageAspect;
			a2 = 1;
		} else {
			a1 = 1;
			a2 = object.height / object.width / imageAspect;
		}
		// update material
		this.material.uniforms.uResolution.value.x = object.width;
		this.material.uniforms.uResolution.value.y = object.height;
		this.material.uniforms.uResolution.value.z = a1;
		this.material.uniforms.uResolution.value.w = a2;
	}

	addControls = () => {
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.enableDamping = true;
	}

	addObjects = () => {
		this.material = new THREE.ShaderMaterial({
			extensions: {
				derivatives: "#extension GL_OES_standard_derivatives : enable"
			},
			uniforms: {
				uTime: { value: 0 },
				uPositions: { value: null },
				uMouse: { value: new THREE.Vector2(0,0) },
				uResolution: { value: new THREE.Vector4() },
			},
			// wireframe: true,
			transparent: true,
			side: THREE.DoubleSide,
			vertexShader: vertex,
			fragmentShader: fragment
		});

		this.count = this.size**2;
		let geometry = new THREE.BufferGeometry();
		let positions = new Float32Array(this.count * 3);
		let uv = new Float32Array(this.count * 2);

		for(let i = 0; i < this.size ; i++) {
			for(let j = 0; j < this.size ; j++) {
				let index = (i+j*this.size);
				positions[index*3+0] = Math.random();
				positions[index*3+1] = Math.random();
				positions[index*3+2] = 1.;
				uv[index*2+0] = i / (this.size);
				uv[index*2+1] = j / (this.size);
			}
		}

		geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));	

		this.material.uniforms.uPositions.value = this.fboTexture;
		this.points = new THREE.Points(geometry, this.material);
		this.scene.add(this.points);
	}

	createMesh = () => {
		// this.keepImageAspectRatio();
		this.mesh = new THREE.Mesh(this.geometry, this.material);
		this.scene.add(this.mesh);
	}

	// composerPass = () => {
		
	// 	this.composer = new EffectComposer(this.renderer);
	// 	this.renderPass = new RenderPass(this.scene, this.camera);
	// 	this.composer.addPass(this.renderPass);

	// 	//custom shader pass
	// 	var myEffect = {
	// 		uniforms: {
	// 			"tDiffuse": { value: null },
	// 			"resolution": { value: new THREE.Vector2(1.,window.innerHeight/window.innerWidth) },
	// 			"uMouse": { value: new THREE.Vector2(0,0) },
	// 			"uVelo": { value: 0 },
	// 			"uTime": { value: 0 }
	// 		},
	// 		vertexShader: `
	// 			varying vec2 vUv;
	// 			void main() {
	// 				vUv = uv;
	// 				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0 );
	// 			}`,
	// 	fragmentShader: `
	// 			uniform float time;
	// 			uniform sampler2D tDiffuse;
	// 			uniform vec2 resolution;
	// 			varying vec2 vUv;
	// 			uniform vec2 uMouse;
	// 			uniform float uVelo;

	// 			float circle(vec2 uv, vec2 disc_center, float disc_radius, float border_size) {
	// 				uv -= disc_center;
	// 				uv*=resolution;
	// 				float dist = sqrt(dot(uv, uv));
	// 				return smoothstep(disc_radius+border_size, disc_radius-border_size, dist);
	// 			}

	// 			void main()  {
	// 				vec2 newUV = vUv;
	// 				vec4 color = vec4(1.,0.,0.,1.);
	// 				float c = circle(newUV, uMouse, 0.0, 0.2);
	// 				float r = texture2D(tDiffuse, newUV.xy += c * (uVelo * .5)).x;
	// 				float g = texture2D(tDiffuse, newUV.xy += c * (uVelo * .525)).y;
	// 				float b = texture2D(tDiffuse, newUV.xy += c * (uVelo * .55)).z;
	// 				color = vec4(r, g, b, 1.);
	// 				gl_FragColor = color;
	// 			}`
	// 	}

	// 	this.customPass = new ShaderPass(myEffect);
	// 	this.customPass.renderToScreen = true;
	// 	this.composer.addPass(this.customPass);
	// }

	stop = () => {
		this.paused = true;
	}

	play = () => {
		this.paused = false;
		this.render();
	}

	getSpeed = () => {
		this.speed = Math.sqrt( (this.prevMouse.x- this.mouse.x)**2 + (this.prevMouse.y- this.mouse.y)**2 );

		this.targetSpeed -= 0.1*(this.targetSpeed - this.speed);
		this.followMouse.x -= 0.1*(this.followMouse.x - this.mouse.x);
		this.followMouse.y -= 0.1*(this.followMouse.y - this.mouse.y);

		this.prevMouse.x = this.mouse.x;
		this.prevMouse.y = this.mouse.y;
	}

	render = () => {
		//this.controls.update();
		this.elapsedTime = this.clock.getElapsedTime();
	
		this.material.uniforms.uTime.value = this.elapsedTime;
		this.fboMaterial.uniforms.uTime.value = this.elapsedTime;

        // this.stats.update();
		// Call tick again on the next frame
		window.requestAnimationFrame(this.render);
		
		// Set the current FBO texture as the input for the shaders
		this.fboMaterial.uniforms.uPositions.value = this.fbo1.texture;
		this.material.uniforms.uPositions.value = this.fbo.texture;
		
		// this.getSpeed();
		// this.material.uniforms.uMouse.value = this.followMouse;
		// this.targetSpeed *= 0.999;

		// Render to the FBO
		this.renderer.setRenderTarget(this.fbo);
		this.renderer.render(this.fboScene, this.fboCamera);
		this.renderer.setRenderTarget(null);
	
		// Render the scene with the updated textures
		this.renderer.render(this.scene, this.camera);
	
		// Swap render targets
		let temp = this.fbo;
		this.fbo = this.fbo1;
		this.fbo1 = temp;

	}
}

new Sketch();