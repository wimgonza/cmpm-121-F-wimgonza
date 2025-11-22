import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

interface KeyInput {
    w: boolean;
    a: boolean;
    s: boolean;
    d: boolean;
    shift: boolean;
}

export class Player {
    scene: THREE.Scene;
    world: CANNON.World;
    camera: THREE.PerspectiveCamera;
    
    walkSpeed: number;
    runSpeed: number;
    
    height: number;
    radius: number;
    
    input: KeyInput;
    body: CANNON.Body;
    controls: PointerLockControls;
    
    // Grab/Interaction Properties
    raycaster: THREE.Raycaster;
    screenCenter: THREE.Vector2;
    handBody: CANNON.Body;
    carriedBody: CANNON.Body | null = null;
    isMouseDown: boolean = false;

    enabled: boolean = true; 

    constructor(scene: THREE.Scene, world: CANNON.World, camera: THREE.PerspectiveCamera) {
        this.scene = scene;
        this.world = world;
        this.camera = camera;

        this.walkSpeed = 10; 
        this.runSpeed = 20;  
        
        this.height = 0.8; 
        this.radius = 0.5; 

        this.raycaster = new THREE.Raycaster();
        this.raycaster.far = 4; // Max grab distance
        this.screenCenter = new THREE.Vector2(0, 0);

        this.input = { w: false, a: false, s: false, d: false, shift: false };

        this.body = this.initPhysics();
        this.handBody = this.initHandPhysics();
        this.controls = this.initControls();
        
        this.initInteraction();
    }

    private initPhysics(): CANNON.Body {
        const shape = new CANNON.Sphere(this.radius);
        const body = new CANNON.Body({
            mass: 1,
            position: new CANNON.Vec3(0, 2, 0), 
            shape: shape,
            material: new CANNON.Material({ friction: 0.0, restitution: 0.0 }),
            fixedRotation: true, 
        });
        
        body.linearDamping = 0.9; 
        
        this.world.addBody(body);
        return body;
    }

    private initHandPhysics(): CANNON.Body {
        // KINEMATIC body acts as the player's "hand" anchor
        const body = new CANNON.Body({
            type: CANNON.Body.KINEMATIC,
            collisionFilterGroup: 0, 
            collisionFilterMask: 0
        });
        this.world.addBody(body);
        return body;
    }

    private initControls(): PointerLockControls {
        const controls = new PointerLockControls(this.camera, document.body);
        document.addEventListener('click', () => {
            if (this.enabled) { controls.lock(); }
        });
        const onKeyDown = (event: KeyboardEvent) => {
            if (!this.enabled) return; 
            switch (event.code) {
                case 'KeyW': this.input.w = true; break; case 'KeyA': this.input.a = true; break;
                case 'KeyS': this.input.s = true; break; case 'KeyD': this.input.d = true; break;
                case 'ShiftLeft': case 'ShiftRight': this.input.shift = true; break;
            }
        };
        const onKeyUp = (event: KeyboardEvent) => {
            switch (event.code) {
                case 'KeyW': this.input.w = false; break; case 'KeyA': this.input.a = false; break;
                case 'KeyS': this.input.s = false; break; case 'KeyD': this.input.d = false; break;
                case 'ShiftLeft': case 'ShiftRight': this.input.shift = false; break;
            }
        };
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        return controls;
    }

    private initInteraction() {
        window.addEventListener('mousedown', (event) => {
            if (this.enabled && this.controls.isLocked && event.button === 0) {
                this.isMouseDown = true;
                this.tryGrab();
            }
        });
        window.addEventListener('mouseup', (event) => {
            if (event.button === 0) {
                this.isMouseDown = false;
                this.release();
            }
        });
    }

    private tryGrab() {
        if (this.carriedBody) return;

        this.raycaster.setFromCamera(this.screenCenter, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        for (const intersect of intersects) {
            const mesh = intersect.object as THREE.Mesh;
            if (mesh.userData.isPickupable && mesh.userData.physicsBody) {
                this.grab(mesh.userData.physicsBody as CANNON.Body);
                break; 
            }
        }
    }

    private grab(body: CANNON.Body) {
        this.carriedBody = body;
        
        // Remove from physics simulation (switch to KINEMATIC)
        body.type = CANNON.Body.KINEMATIC;
        body.velocity.set(0, 0, 0);
        body.angularVelocity.set(0, 0, 0);
        
        // Optional: Disable collision response if you want it to pass through walls
        // body.collisionFilterGroup = 0;
    }

    private release() {
        if (this.carriedBody) {
            // Re-enable physics
            this.carriedBody.type = CANNON.Body.DYNAMIC;
            this.carriedBody.velocity.copy(this.body.velocity); // Inherit player velocity
            this.carriedBody = null;
        }
    }

    setControls(enabled: boolean) {
        this.enabled = enabled;
        if (enabled) {
            this.controls.lock(); 
        } else {
            this.controls.unlock(); 
            this.input = { w: false, a: false, s: false, d: false, shift: false };
            this.body.velocity.set(0, 0, 0); 
            // Release item if minigame starts
            this.release(); 
        }
    }

    update() {
        // Calculate movement only if enabled and locked
        if (this.controls.isLocked && this.enabled) {
            const currentSpeed = this.input.shift ? this.runSpeed : this.walkSpeed;

            const direction = new THREE.Vector3();
            const frontVector = new THREE.Vector3( 0, 0, Number(this.input.s) - Number(this.input.w) );
            const sideVector = new THREE.Vector3( Number(this.input.d) - Number(this.input.a), 0, 0 );

            direction.addVectors(frontVector, sideVector).normalize().multiplyScalar(currentSpeed);

            const euler = new THREE.Euler(0, 0, 0, 'YXZ');
            euler.setFromQuaternion(this.camera.quaternion);
            
            const v_x = Math.sin(euler.y) * direction.z + Math.cos(euler.y) * direction.x;
            const v_z = Math.cos(euler.y) * direction.z - Math.sin(euler.y) * direction.x;

            this.body.velocity.x = v_x;
            this.body.velocity.z = v_z;
        }

        // Camera sync
        this.camera.position.set(
            this.body.position.x,
            this.body.position.y + this.height,
            this.body.position.z
        );

        // Hand position update (KINEMATIC body)
        const handOffset = new THREE.Vector3(0, 0, -2.5); // 2.5m in front of camera
        handOffset.applyQuaternion(this.camera.quaternion);
        const handPos = this.camera.position.clone().add(handOffset);
        this.handBody.position.copy(handPos as unknown as CANNON.Vec3);

        // Update carried object position directly
        if (this.carriedBody) {
            this.carriedBody.position.copy(this.handBody.position);
            this.carriedBody.quaternion.copy(this.camera.quaternion as unknown as CANNON.Quaternion);
        }
    }
}