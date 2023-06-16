namespace Script {
  import ƒ = FudgeCore;
  import ƒAid = FudgeAid;
  ƒ.Debug.info("Main Program Template running!");

  let viewport: ƒ.Viewport;
  document.addEventListener("interactiveViewportStarted", <EventListener><unknown>start);
  let car: ƒ.Node;
  let obstacles: ƒ.Node;
  let carObstacle: ƒ.Node;
  let speed: ƒ.Vector3 = new ƒ.Vector3(0, -0.01, 0);
  let carControl: ƒ.Vector3 = new ƒ.Vector3(0, 0, 0);
  let road: ƒ.Node;
  let roadsprite: ƒAid.NodeSprite;
  let carsprite: ƒAid.NodeSprite;
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

 
  
  async function start(_event: CustomEvent): Promise<void> {
    viewport = _event.detail;
    
    viewport.camera.attachToNode(road);
    viewport.camera.mtxPivot.translate(new ƒ.Vector3(0, 3.185, -10.9));
    viewport.camera.mtxPivot.rotateY(180, true);

    let graph: ƒ.Node = viewport.getBranch();
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

    ƒ.Loop.addEventListener(ƒ.EVENT.LOOP_FRAME, update);
    ƒ.Loop.start();  // start the game loop to continously draw the viewport, update the audiosystem and drive the physics i/a
  }

  function update(_event: Event): void {
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
      carControl.set(0,0,0);
    }
    

    console.log("Z-Achse = " + car.mtxLocal.translation.y);
    car.mtxLocal.translate(carControl);
    viewport.draw();
    ƒ.AudioManager.default.update();
  }


    function onLane(_x: number): boolean {
    let graph: ƒ.Node = viewport.getBranch();
    let car: ƒ.Node = graph.getChildrenByName("Car")[0];
    let lane: number = Math.round(car.mtxLocal.translation.x);
    if (lane === -2 || lane === -1 || lane === 1 || lane === 2) {
      console.log("Ist auf einer Spur");
      console.log(lane);
        return true;
    } else {
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
  
 async function createRoadSprite(): Promise<ƒAid.NodeSprite> {
    let imgSpriteSheet: ƒ.TextureImage = new ƒ.TextureImage();
    await imgSpriteSheet.load("Textures/Road_bearbeitet.png");
    let coat: ƒ.CoatTextured = new ƒ.CoatTextured(undefined, imgSpriteSheet);
    let animation: ƒAid.SpriteSheetAnimation = new ƒAid.SpriteSheetAnimation("Highway", coat);
    animation.generateByGrid(ƒ.Rectangle.GET(0, 0, 280, 446), 2, 70, ƒ.ORIGIN2D.BOTTOMCENTER, ƒ.Vector2.X(280));
    let sprite: ƒAid.NodeSprite = new ƒAid.NodeSprite("Sprite");
    sprite.setAnimation(animation);
    sprite.setFrameDirection(-1);
    sprite.framerate = 8;

    let cmpTransfrom: ƒ.ComponentTransform = new ƒ.ComponentTransform();
    sprite.addComponent(cmpTransfrom);

    return sprite;
  }

  async function createCarSprite(): Promise<ƒAid.NodeSprite> {
    let imgSpriteSheet: ƒ.TextureImage = new ƒ.TextureImage();
    await imgSpriteSheet.load("Textures/simple-travel-car-top_view.png");
    let coat: ƒ.CoatTextured = new ƒ.CoatTextured(undefined, imgSpriteSheet);
    let animation: ƒAid.SpriteSheetAnimation = new ƒAid.SpriteSheetAnimation("Car", coat);
    animation.generateByGrid(ƒ.Rectangle.GET(0, 0, 124, 250), 1, 248, ƒ.ORIGIN2D.CENTER, ƒ.Vector2.X(124));
    let sprite: ƒAid.NodeSprite = new ƒAid.NodeSprite("CarSprite");
    sprite.setAnimation(animation);
    sprite.setFrameDirection(1);
    sprite.framerate = 8;

    let cmpTransfrom: ƒ.ComponentTransform = new ƒ.ComponentTransform();
    sprite.addComponent(cmpTransfrom);

    return sprite;
  }

  
}
