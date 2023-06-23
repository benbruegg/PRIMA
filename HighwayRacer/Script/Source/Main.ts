namespace Script {
  import ƒ = FudgeCore;
  import ƒAid = FudgeAid;

  document.addEventListener("interactiveViewportStarted", <EventListener><unknown>start);
  ƒ.Debug.info("Main Program Template running!");


  interface Config {
    gameSpeed: number;
    obstacleSpeed: ƒ.Vector3;
  }

  let viewport: ƒ.Viewport;
  let car: ƒ.Node;
  let obstacles: ƒ.Node;
  let exhaust: ƒ.Node;
  let road: ƒ.Node;
  let sound: ƒ.Node;

  let obstacleSpeed: ƒ.Vector3;
  let carControl: ƒ.Vector3 = new ƒ.Vector3(0, 0, 0);

  let roadsprite: ƒAid.NodeSprite;
  let exhaustsprite: ƒAid.NodeSprite;

  let gameState: GameState;
  let gameSpeed: number;
  let roadAnimationFramerate: number = 4;
  let gameOver: boolean = false;
  let obstacleCreated = false;
  let obstacleCreationTimeout: number;

  let engineSound: ƒ.ComponentAudio;
  let crashSound: ƒ.ComponentAudio;
  let carPassingSound: ƒ.ComponentAudio;
  let truckHornSound: ƒ.ComponentAudio;
  let driftSound: ƒ.ComponentAudio;
  let carHornSound: ƒ.ComponentAudio;
  let policeSound: ƒ.ComponentAudio;

  let config: Config;


  // declare Game Over Event
  const EVENT_GAME_OVER: string = "gameOver";
  const EVENT_COLLISION = "collisionEvent";
  //Class to define obstacles as nodes
  class Obstacle extends ƒ.Node {
    public passed: boolean = false;
    declare public obstacleSpeedModifier: number;

    constructor(texture: ƒ.TextureImage, scaling: ƒ.Vector3, obstacleSpeedModifier: number, isPulsing: boolean) {
      super("Obstacle");

      this.obstacleSpeedModifier = obstacleSpeedModifier;
      this.addComponent(new ƒ.ComponentTransform());
      let mesh = new ƒ.MeshSprite();
      this.addComponent(new ƒ.ComponentMesh(mesh));
      let obstacleMesh = this.getComponent(ƒ.ComponentMesh);
      obstacleMesh.mtxPivot.scale(scaling);
      let textureImage = new ƒ.TextureImage();
      textureImage.image = texture.image;

      let material = new ƒ.Material("ObstacleMaterial", ƒ.ShaderLitTextured, new ƒ.CoatTextured(new ƒ.Color(1, 1, 1, 1), textureImage));
      // let material = new ƒ.Material("ObstacleMaterial", ƒ.ShaderLit);   // used for debugging to see the actual mesh
      let cmpMaterial = new ƒ.ComponentMaterial(material);
      this.addComponent(cmpMaterial);

      // check if the obstacle is supposed to be pulsing to add Scriptcomponent
      if (isPulsing) {
        this.addComponent(new Pulsing());
      }

      obstacles.appendChild(this);
    }
  }

  async function start(_event: CustomEvent): Promise<void> {
    let response: Response = await fetch("config.json");
    let config: Config = await response.json();

    gameSpeed = config.gameSpeed;
    obstacleSpeed = config.obstacleSpeed;

    viewport = _event.detail;
    viewport.camera.attachToNode(road);
    viewport.camera.mtxPivot.translate(new ƒ.Vector3(0, 3.185, -10.9));
    viewport.camera.mtxPivot.rotateY(180, true);

    gameState = new GameState();
    let graph: ƒ.Node = viewport.getBranch();
    car = graph.getChildrenByName("Car")[0];
    obstacles = graph.getChildrenByName("Obstacles")[0];
    road = graph.getChildrenByName("Road")[0];

    exhaust = car.getChildrenByName("Exhaust")[0];
    graph.addEventListener("toggleExhaust", hndExhaust);
    document.addEventListener(EVENT_GAME_OVER, handleGameOver);
    document.addEventListener("keydown", carGas);
    document.addEventListener("keydown", carMove);
    document.addEventListener("keyup", stopCarGas);
    graph.addEventListener(EVENT_COLLISION, handleCollision);

    exhaust.activate(false);
    roadsprite = await createRoadSprite();
    road.addChild(roadsprite);
    exhaustsprite = await createExhaustSprite();
    exhaust.addChild(exhaustsprite);

    road.getComponent(ƒ.ComponentMaterial).activate(false);
    exhaust.getComponent(ƒ.ComponentMaterial).activate(false);

  

    ƒ.AudioManager.default.listenTo(graph);
    sound = graph.getChildrenByName("Sound")[0];
    crashSound = sound.getComponents(ƒ.ComponentAudio)[0];
    truckHornSound = sound.getComponents(ƒ.ComponentAudio)[1];
    carPassingSound = sound.getComponents(ƒ.ComponentAudio)[2];
    engineSound = sound.getComponents(ƒ.ComponentAudio)[3];
    driftSound = sound.getComponents(ƒ.ComponentAudio)[4];
    carHornSound = sound.getComponents(ƒ.ComponentAudio)[5];
    policeSound = sound.getComponents(ƒ.ComponentAudio)[6];

    // Create instances of obstacles
    createObstacle();

    ƒ.Loop.addEventListener(ƒ.EVENT.LOOP_FRAME, update);
    ƒ.Loop.start();  // start the game loop to continuously draw the viewport, update the audiosystem and drive the physics i/a

  }


  function update(_event: Event): void {
    if (gameOver)
      return;
    // ƒ.Physics.simulate(); 

    // Move the obstacles and remove them after going out of camera view
    for (const obstacle of obstacles.getChildren()) {
      let obstacleSpeedModifier: number = obstacle["obstacleSpeedModifier"];
      obstacle.mtxLocal.translateY(obstacleSpeed.y * obstacleSpeedModifier);
      // Check if the obstacle has moved below a certain y-coordinate
      if (obstacle.mtxLocal.translation.y < -2) {
        obstacles.removeChild(obstacle); // Remove the obstacle from the obstacles node
      }
    }

    // check for collisions
    for (const obstacle of obstacles.getChildren()) {
      checkCollision(car, obstacle);
    }

    //set gamespeed increase per second
    gameSpeed += 0.000001 * ƒ.Loop.timeFrameStartReal / 1000;
    if (gameSpeed > 0.1) {
      gameSpeed = 0.1;
    }

    // Update the speed of the obstacles 
    obstacleSpeed.y -= (gameSpeed / 1000);

    gameState.carSpeed = Math.round(gameSpeed * 3600); // Convert gameSpeed to km/h

    const timeElapsedinSeconds: number = ƒ.Loop.timeFrameReal / 1000;
    const distance: number = (gameState.carSpeed * timeElapsedinSeconds) / 3600; // Distance in kilometers s = v * t

    gameState.distanceTraveled += distance;

    gameState.distanceTraveled = Number(gameState.distanceTraveled.toFixed(3));

    // create more obstacles after 1.5km traveled
    if (gameState.distanceTraveled > 1.5 && !obstacleCreated) {
      createObstacle();
      obstacleCreated = true;
    }
    roadAnimationFramerate += gameSpeed;
    roadsprite.framerate = roadAnimationFramerate;

    carMove();

    viewport.draw();
    ƒ.AudioManager.default.update();
  }
  // car movement 
  function carMove(): void {
    if (car.mtxLocal.translation.x < 1.5 && ƒ.Keyboard.isPressedOne([ƒ.KEYBOARD_CODE.ARROW_RIGHT, ƒ.KEYBOARD_CODE.D])) {
      carControl.set(0.06, 0, 0);
    }
    else if (car.mtxLocal.translation.x > -1.5 && ƒ.Keyboard.isPressedOne([ƒ.KEYBOARD_CODE.ARROW_LEFT, ƒ.KEYBOARD_CODE.A])) {
      carControl.set(-0.06, 0, 0);
    }
    else if (car.mtxLocal.translation.y > 0.6 && ƒ.Keyboard.isPressedOne([ƒ.KEYBOARD_CODE.ARROW_DOWN, ƒ.KEYBOARD_CODE.S])) {
      carControl.set(0, -0.06, 0);
    }
    else if (car.mtxLocal.translation.y < 5.8 && ƒ.Keyboard.isPressedOne([ƒ.KEYBOARD_CODE.ARROW_UP, ƒ.KEYBOARD_CODE.W])) {
      carControl.set(0, 0.06, 0);
    }
    else {
      carControl.set(0, 0, 0);
    }


    car.mtxLocal.translate(carControl);
  }
  function handleCollision(event: CustomEvent): void {
    const collidedObstacle = event.detail.collidedObstacle;



    const gameOverEvent: Event = new Event(EVENT_GAME_OVER);
    document.dispatchEvent(gameOverEvent);
  }

  function hndExhaust(_event: Event): void {
    if (!exhaust.isActive) {
      exhaust.activate(true);
    }
  }


  function carGas(_event: KeyboardEvent): void {
    if (_event.code == ƒ.KEYBOARD_CODE.ARROW_UP || _event.code == ƒ.KEYBOARD_CODE.W) {
      exhaust.dispatchEvent(new Event("toggleExhaust", { bubbles: true }));
    }
  }

  function stopCarGas(_event: KeyboardEvent): void {
    if (_event.code == ƒ.KEYBOARD_CODE.ARROW_UP || _event.code == ƒ.KEYBOARD_CODE.W) {
      exhaust.activate(false);
    }
  }

  function checkCollision(car: ƒ.Node, obstacle: ƒ.Node) {
    const carPosition = car.mtxLocal.translation;
    const obstaclePosition = obstacle.mtxLocal.translation;
    const carSize = car.getComponent(ƒ.ComponentMesh).mtxPivot.scaling;
    const obstacleSize = obstacle.getComponent(ƒ.ComponentMesh).mtxPivot.scaling;

    const carHalfWidth = carSize.x / 2;
    const carHalfHeight = carSize.y / 2;
    const obstacleHalfWidth = obstacleSize.x / 2;
    const obstacleHalfHeight = obstacleSize.y / 2;

    const carCenterX = carPosition.x;
    const carCenterY = carPosition.y;
    const obstacleCenterX = obstaclePosition.x;
    const obstacleCenterY = obstaclePosition.y;

    // Calculate the distance between the centers of the car and obstacle
    const dx = carCenterX - obstacleCenterX;
    const dy = carCenterY - obstacleCenterY;
    const combinedHalfWidths = carHalfWidth + obstacleHalfWidth;
    const combinedHalfHeights = carHalfHeight + obstacleHalfHeight;

    // Check for a collision on the x and y axes
    if (Math.abs(dx) <= combinedHalfWidths && Math.abs(dy) <= combinedHalfHeights) {
      // Collision detected   
      crashSound.play(true);
      const event: CustomEvent = new CustomEvent(EVENT_COLLISION, {
        bubbles: true,
        detail: { collidedObstacle: obstacle },
      });
      car.dispatchEvent(event);
    } else if (carPosition.y > obstaclePosition.y && !obstacle.passed) {
      carPassingSound.play(true);
      obstacle.passed = true; // Mark the obstacle as passed
      gameState.score++;
      gameState.finalScore = gameState.score;

    }

  }
  // Game Stop 
  function handleGameOver(): void {
    ƒ.Loop.stop();
    clearTimeout(obstacleCreationTimeout);
    engineSound.play(false);
    gameOver = true;
    let gameOverScreen: HTMLDivElement = document.querySelector("#gameOverScreen");
    let vui: HTMLDivElement = document.querySelector("#vui");
    vui.style.cursor = "auto";
    gameOverScreen.style.display = "block";
    console.log("Game Over");
  }

  // liefert zufällig einen von 4 x Werten der verschiedenen Spuren
  function getRandomXValue(): number {
    const xValues: number[] = [1.5, 0.5, -0.5, -1.5];
    const randomIndex: number = Math.floor(Math.random() * xValues.length);
    return xValues[randomIndex];
  }

  function getRandomNumber(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }


  function createObstacle(): void {
    if (gameOver) {
      return;
    }
    const obstacleTextures: ƒ.TextureImage[] = [
      new ƒ.TextureImage("Textures/police.png"),
      new ƒ.TextureImage("Textures/Pothole.png"),
      new ƒ.TextureImage("Textures/Truck.png"),
      new ƒ.TextureImage("Textures/Car_Yellow.png"),
      new ƒ.TextureImage("Textures/Car_White.png")
    ];
  
    const textureIndex: number = Math.floor(Math.random() * obstacleTextures.length);
    const texture: ƒ.TextureImage = obstacleTextures[textureIndex];
  

    let scaling: ƒ.Vector3;
    let isPulsing: boolean;
    let obstacleSpeedModifier: number;
    let policeSprite: ƒAid.NodeSprite;
    policeSprite = createPoliceSprite(texture);

    if (textureIndex === 0) {
      // Police
      obstacleSpeedModifier = 1;
      policeSound.play(true);
      scaling = new ƒ.Vector3(0.8, 0.8, 1);
      isPulsing = true;
    } else if (textureIndex === 1) {
      // Pothole
      obstacleSpeedModifier = 0.6;
      scaling = new ƒ.Vector3(0.4, 0.4, 1);
      isPulsing = false;
    } else if (textureIndex === 2) {
      // Truck
      obstacleSpeedModifier = 0.9;
      truckHornSound.play(true);
      scaling = new ƒ.Vector3(0.7, 1.8, 1);
      isPulsing = true;
    } else if (textureIndex === 3) {
      // Car_Yellow
      obstacleSpeedModifier = 1;
      scaling = new ƒ.Vector3(0.6, 1, 1);
      isPulsing = true;
    } else if (textureIndex === 4) {
      // Car_White
      obstacleSpeedModifier = 1.4;
      carHornSound.play(true);
      scaling = new ƒ.Vector3(0.6, 1, 1);
      isPulsing = true;
    }

    const obstacle = new Obstacle(texture, scaling, obstacleSpeedModifier, isPulsing);
    obstacle.passed = false;
    if (textureIndex === 0) {
      obstacle.addChild(policeSprite);
      obstacle.getComponent(ƒ.ComponentMaterial).activate(false);
    }

    let obstaclePosition: ƒ.Vector3;
    let obstaclesInRange: Obstacle[];

    do {
      const newXValue = getRandomXValue();
      obstaclePosition = new ƒ.Vector3(newXValue, getRandomNumber(7, 7), 0);
      obstaclesInRange = obstacles.getChildren().filter((obstacle: Obstacle) => {
        const obstaclePositionX = obstacle.mtxLocal.translation.x;
        const obstaclePositionY = obstacle.mtxLocal.translation.y;
        const obstaclePositionXNew = obstaclePosition.x;
        const obstaclePositionYNew = obstaclePosition.y;
        const maxXDistance = 0.5;
        const minYRange = 3;

        return (
          Math.abs(obstaclePositionX - obstaclePositionXNew) < maxXDistance &&
          Math.abs(obstaclePositionY - obstaclePositionYNew) < minYRange
        );
      });
    } while (obstaclesInRange.length > 0);

    obstacle.mtxLocal.translation = obstaclePosition;
    obstacles.appendChild(obstacle);

    scheduleNextObstacleCreation();
  }



  function scheduleNextObstacleCreation(): void {
    const minInterval: number = 6 - (gameSpeed * 50); // Minimum interval in seconds
    const maxInterval: number = 10 - (gameSpeed) * 50; // Maximum interval in seconds
    const interval: number = getRandomNumber(minInterval, maxInterval); // Random interval in seconds
    // Wait for the interval and then create a random obstacle
    obstacleCreationTimeout = setTimeout(createObstacle, interval * 1000);
  }
  
  async function createRoadSprite(): Promise<ƒAid.NodeSprite> {
    let imgSpriteSheet: ƒ.TextureImage = new ƒ.TextureImage();
    await imgSpriteSheet.load("Textures/Road_bearbeitet_neu.png");
    let coat: ƒ.CoatTextured = new ƒ.CoatTextured(undefined, imgSpriteSheet);
    let animation: ƒAid.SpriteSheetAnimation = new ƒAid.SpriteSheetAnimation("Highway", coat);
    animation.generateByGrid(ƒ.Rectangle.GET(0, 0, 280, 892), 2, 70, ƒ.ORIGIN2D.BOTTOMCENTER, ƒ.Vector2.X(280));
    let sprite: ƒAid.NodeSprite = new ƒAid.NodeSprite("Sprite");
    sprite.setAnimation(animation);
    sprite.setFrameDirection(-1);
    sprite.framerate = roadAnimationFramerate;

    let cmpTransfrom: ƒ.ComponentTransform = new ƒ.ComponentTransform();
    sprite.addComponent(cmpTransfrom);
    sprite.mtxLocal.translateY(-2);

    return sprite;
  }





  async function createExhaustSprite(): Promise<ƒAid.NodeSprite> {
    let imgSpriteSheet: ƒ.TextureImage = new ƒ.TextureImage();
    await imgSpriteSheet.load("Textures/exhaust.png");
    let coat: ƒ.CoatTextured = new ƒ.CoatTextured(undefined, imgSpriteSheet);
    let animation: ƒAid.SpriteSheetAnimation = new ƒAid.SpriteSheetAnimation("Exhaust", coat);
    animation.generateByGrid(ƒ.Rectangle.GET(0, 0, 85, 172), 5, 240, ƒ.ORIGIN2D.CENTER, ƒ.Vector2.X(85));
    let sprite: ƒAid.NodeSprite = new ƒAid.NodeSprite("ExhaustSprite");
    sprite.setAnimation(animation);
    sprite.setFrameDirection(-1);
    sprite.framerate = 24;

    let cmpTransfrom: ƒ.ComponentTransform = new ƒ.ComponentTransform();
    sprite.addComponent(cmpTransfrom);

    return sprite;
  }


  function createPoliceSprite(texture: ƒ.TextureImage): ƒAid.NodeSprite {
    let coat: ƒ.CoatTextured = new ƒ.CoatTextured(undefined, texture);
    let animation: ƒAid.SpriteSheetAnimation = new ƒAid.SpriteSheetAnimation("Police", coat);
    animation.generateByGrid(ƒ.Rectangle.GET(0, 0, 98, 214), 3, 214, ƒ.ORIGIN2D.BOTTOMCENTER, ƒ.Vector2.X(98));
    let sprite: ƒAid.NodeSprite = new ƒAid.NodeSprite("PoliceSprite");
    sprite.setAnimation(animation);
    sprite.setFrameDirection(-1);
    sprite.framerate = 8;

    let cmpTransfrom: ƒ.ComponentTransform = new ƒ.ComponentTransform();
    sprite.addComponent(cmpTransfrom);

    return sprite;
  }
}
