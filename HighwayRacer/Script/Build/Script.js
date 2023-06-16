"use strict";
var Script;
(function (Script) {
    var ƒ = FudgeCore;
    ƒ.Project.registerScriptNamespace(Script); // Register the namespace to FUDGE for serialization
    class CustomComponentScript extends ƒ.ComponentScript {
        // Register the script as component for use in the editor via drag&drop
        static iSubclass = ƒ.Component.registerSubclass(CustomComponentScript);
        // Properties may be mutated by users in the editor via the automatically created user interface
        message = "CustomComponentScript added to ";
        constructor() {
            super();
            // Don't start when running in editor
            if (ƒ.Project.mode == ƒ.MODE.EDITOR)
                return;
            // Listen to this component being added to or removed from a node
            this.addEventListener("componentAdd" /* COMPONENT_ADD */, this.hndEvent);
            this.addEventListener("componentRemove" /* COMPONENT_REMOVE */, this.hndEvent);
            this.addEventListener("nodeDeserialized" /* NODE_DESERIALIZED */, this.hndEvent);
        }
        // Activate the functions of this component as response to events
        hndEvent = (_event) => {
            switch (_event.type) {
                case "componentAdd" /* COMPONENT_ADD */:
                    ƒ.Debug.log(this.message, this.node);
                    break;
                case "componentRemove" /* COMPONENT_REMOVE */:
                    this.removeEventListener("componentAdd" /* COMPONENT_ADD */, this.hndEvent);
                    this.removeEventListener("componentRemove" /* COMPONENT_REMOVE */, this.hndEvent);
                    break;
                case "nodeDeserialized" /* NODE_DESERIALIZED */:
                    // if deserialized the node is now fully reconstructed and access to all its components and children is possible
                    break;
            }
        };
    }
    Script.CustomComponentScript = CustomComponentScript;
})(Script || (Script = {}));
var Script;
(function (Script) {
    var ƒ = FudgeCore;
    var ƒAid = FudgeAid;
    ƒ.Debug.info("Main Program Template running!");
    let viewport;
    document.addEventListener("interactiveViewportStarted", start);
    let car;
    let obstacles;
    let carObstacle;
    let speed = new ƒ.Vector3(0, -0.01, 0);
    let carControl = new ƒ.Vector3(0, 0, 0);
    let road;
    let roadsprite;
    let carsprite;
    /*
      class Obstacle extends ƒ.Node {
        private additionalProperty: string;
    
        constructor(data: T, additionalProperty: string) {
          super(data); // Call the parent class constructor
          
          this.additionalProperty = additionalProperty;
        }
      
        getAdditionalProperty(): string {
          return this.additionalProperty;
        }
        
      }
    
      function createObstacle(): Obstacle {
    
        return any;
      }
    
      */
    async function start(_event) {
        viewport = _event.detail;
        viewport.camera.attachToNode(road);
        viewport.camera.mtxPivot.translate(new ƒ.Vector3(0, 3.185, -10.9));
        viewport.camera.mtxPivot.rotateY(180, true);
        let graph = viewport.getBranch();
        car = graph.getChildrenByName("Car")[0];
        obstacles = graph.getChildrenByName("Obstacles")[0];
        carObstacle = obstacles.getChildrenByName("CarObstacle")[0];
        road = graph.getChildrenByName("Background")[0];
        roadsprite = await createRoadSprite();
        road.addChild(roadsprite);
        carsprite = await createCarSprite();
        car.addChild(carsprite);
        road.getComponent(ƒ.ComponentMaterial).activate(false);
        car.getComponent(ƒ.ComponentMaterial).activate(false);
        ƒ.Loop.addEventListener("loopFrame" /* LOOP_FRAME */, update);
        ƒ.Loop.start(); // start the game loop to continously draw the viewport, update the audiosystem and drive the physics i/a
    }
    function update(_event) {
        // ƒ.Physics.simulate();  // if physics is included and used
        carObstacle.mtxLocal.translate(speed);
        if (car.mtxLocal.translation.x < 1.5 && ƒ.Keyboard.isPressedOne([ƒ.KEYBOARD_CODE.ARROW_RIGHT, ƒ.KEYBOARD_CODE.D])) {
            carControl.set(0.07, 0, 0);
        }
        else if (car.mtxLocal.translation.x > -1.5 && ƒ.Keyboard.isPressedOne([ƒ.KEYBOARD_CODE.ARROW_LEFT, ƒ.KEYBOARD_CODE.A])) {
            carControl.set(-0.07, 0, 0);
        }
        else if (car.mtxLocal.translation.y > 0.55 && ƒ.Keyboard.isPressedOne([ƒ.KEYBOARD_CODE.ARROW_DOWN, ƒ.KEYBOARD_CODE.S])) {
            carControl.set(0, -0.07, 0);
        }
        else if (car.mtxLocal.translation.y < 5.8 && ƒ.Keyboard.isPressedOne([ƒ.KEYBOARD_CODE.ARROW_UP, ƒ.KEYBOARD_CODE.W])) {
            carControl.set(0, 0.07, 0);
        }
        else {
            carControl.set(0, 0, 0);
        }
        console.log("Z-Achse = " + car.mtxLocal.translation.y);
        car.mtxLocal.translate(carControl);
        viewport.draw();
        ƒ.AudioManager.default.update();
    }
    function onLane(_x) {
        let graph = viewport.getBranch();
        let car = graph.getChildrenByName("Car")[0];
        let lane = Math.round(car.mtxLocal.translation.x);
        if (lane === -2 || lane === -1 || lane === 1 || lane === 2) {
            console.log("Ist auf einer Spur");
            console.log(lane);
            return true;
        }
        else {
            console.log("Ist auf keiner Spur");
            console.log(lane);
            return false;
        }
    }
    /*
     function createObstacle(): ƒ.Node {
   
       class Obstacle extends new ƒ.Node();
       
       let node: ƒ.Node
     
   
       return node;
     }
     */
    async function createRoadSprite() {
        let imgSpriteSheet = new ƒ.TextureImage();
        await imgSpriteSheet.load("Textures/Road_bearbeitet.png");
        let coat = new ƒ.CoatTextured(undefined, imgSpriteSheet);
        let animation = new ƒAid.SpriteSheetAnimation("Highway", coat);
        animation.generateByGrid(ƒ.Rectangle.GET(0, 0, 280, 446), 2, 70, ƒ.ORIGIN2D.BOTTOMCENTER, ƒ.Vector2.X(280));
        let sprite = new ƒAid.NodeSprite("Sprite");
        sprite.setAnimation(animation);
        sprite.setFrameDirection(-1);
        sprite.framerate = 8;
        let cmpTransfrom = new ƒ.ComponentTransform();
        sprite.addComponent(cmpTransfrom);
        return sprite;
    }
    async function createCarSprite() {
        let imgSpriteSheet = new ƒ.TextureImage();
        await imgSpriteSheet.load("Textures/simple-travel-car-top_view.png");
        let coat = new ƒ.CoatTextured(undefined, imgSpriteSheet);
        let animation = new ƒAid.SpriteSheetAnimation("Car", coat);
        animation.generateByGrid(ƒ.Rectangle.GET(0, 0, 124, 250), 1, 248, ƒ.ORIGIN2D.CENTER, ƒ.Vector2.X(124));
        let sprite = new ƒAid.NodeSprite("CarSprite");
        sprite.setAnimation(animation);
        sprite.setFrameDirection(1);
        sprite.framerate = 8;
        let cmpTransfrom = new ƒ.ComponentTransform();
        sprite.addComponent(cmpTransfrom);
        return sprite;
    }
})(Script || (Script = {}));
//# sourceMappingURL=Script.js.map