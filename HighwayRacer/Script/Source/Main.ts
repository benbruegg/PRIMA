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
  let obstacleSpeed: ƒ.Vector3;
  let carControl: ƒ.Vector3 = new ƒ.Vector3(0, 0, 0);
  let road: ƒ.Node;
  let roadsprite: ƒAid.NodeSprite;
  let carsprite: ƒAid.NodeSprite;
  let gameState: GameState;
  let gameSpeed: number;
  let roadAnimationFramerate: number = 4;
  let gameOver: boolean = false;
  let engineSound: ƒ.ComponentAudio;
  let crashSound: ƒ.ComponentAudio;
  let carPassingSound: ƒ.ComponentAudio;
  let truckHornSound: ƒ.ComponentAudio;
  let obstacleCreated = false;
  let obstacleCreationTimeout: number;
  let config: Config;


  // declare Game Over Event
  const EVENT_GAME_OVER: string = "gameOver";

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

    // Listen for the game over event
    document.addEventListener(EVENT_GAME_OVER, handleGameOver);

    let graph: ƒ.Node = viewport.getBranch();
    car = graph.getChildrenByName("Car")[0];
    obstacles = graph.getChildrenByName("Obstacles")[0];
    road = graph.getChildrenByName("Background")[0];

    roadsprite = await createRoadSprite();
    road.addChild(roadsprite);

    carsprite = await createCarSprite();
    car.addChild(carsprite);

    road.getComponent(ƒ.ComponentMaterial).activate(false);
    car.getComponent(ƒ.ComponentMaterial).activate(false);

    engineSound = graph.getChildrenByName("Sound")[0].getComponents(ƒ.ComponentAudio)[3];
    crashSound = graph.getChildrenByName("Sound")[0].getComponents(ƒ.ComponentAudio)[0];
    truckHornSound = graph.getChildrenByName("Sound")[0].getComponents(ƒ.ComponentAudio)[1];
    carPassingSound = graph.getChildrenByName("Sound")[0].getComponents(ƒ.ComponentAudio)[2];


    // Create instances of obstacles
    createObstacle();
    
    ƒ.Loop.addEventListener(ƒ.EVENT.LOOP_FRAME, update);
    ƒ.Loop.start();  // start the game loop to continuously draw the viewport, update the audiosystem and drive the physics i/a

  }

  function update(_event: Event): void {
    if (gameOver)
      return;

    if (car.mtxLocal.translation.x < 1.5 && ƒ.Keyboard.isPressedOne([ƒ.KEYBOARD_CODE.ARROW_RIGHT, ƒ.KEYBOARD_CODE.D])) {
      carControl.set(0.06, 0, 0);
    }
    else if (car.mtxLocal.translation.x > -1.5 && ƒ.Keyboard.isPressedOne([ƒ.KEYBOARD_CODE.ARROW_LEFT, ƒ.KEYBOARD_CODE.A])) {
      carControl.set(-0.06, 0, 0);
    }
    else if (car.mtxLocal.translation.y > 0.55 && ƒ.Keyboard.isPressedOne([ƒ.KEYBOARD_CODE.ARROW_DOWN, ƒ.KEYBOARD_CODE.S])) {
      carControl.set(0, -0.06, 0);
    }
    else if (car.mtxLocal.translation.y < 5.8 && ƒ.Keyboard.isPressedOne([ƒ.KEYBOARD_CODE.ARROW_UP, ƒ.KEYBOARD_CODE.W])) {
      carControl.set(0, 0.06, 0);
    }
    else {
      carControl.set(0, 0, 0);
    }


    // Move the signs and check for collisions
    for (const obstacle of obstacles.getChildren()) {
      let obstacleSpeedModifier: number = obstacle["obstacleSpeedModifier"];
      obstacle.mtxLocal.translateY(obstacleSpeed.y * obstacleSpeedModifier);
      // Check if the sign has moved below a certain y-coordinate
      if (obstacle.mtxLocal.translation.y < -2) {
        obstacles.removeChild(obstacle); // Remove the sign from the obstacles node
      }
    }

    // Move the signs and check for collisions
    for (const obstacle of obstacles.getChildren()) {
      // Check for collision with the car
      checkCollision(car, obstacle);
    }

    //set gamespeed increase per second

    gameSpeed += 0.000001 * ƒ.Loop.timeFrameStartReal / 1000;
    if (gameSpeed > 0.1) {
      gameSpeed = 0.1;
    }

    // Update the speed of the signs 
    obstacleSpeed.y -= (gameSpeed / 1000);

    gameState.carSpeed = Math.round(gameSpeed * 3600); // Convert gameSpeed to km/h
    // Assuming timeElapsed is given in milliseconds

    const timeElapsedinSeconds: number = ƒ.Loop.timeFrameReal / 1000;
    const distance: number = (gameState.carSpeed * timeElapsedinSeconds) / 3600; // Distance in kilometers
    gameState.distanceTraveled += distance;

    gameState.distanceTraveled = Number(gameState.distanceTraveled.toFixed(3));

    if (gameState.distanceTraveled > 1.5 && !obstacleCreated) {
      createObstacle();
      obstacleCreated = true;
    }
    roadAnimationFramerate += gameSpeed;
    roadsprite.framerate = roadAnimationFramerate;


    car.mtxLocal.translate(carControl);
    viewport.draw();
    ƒ.AudioManager.default.update();
  }

  function checkCollision(car: ƒ.Node, obstacle: ƒ.Node): void {
    const carPosition = car.mtxLocal.translation;
    const obstaclePosition = obstacle.mtxLocal.translation;
    const carSize = car.getComponent(ƒ.ComponentMesh).mtxPivot.scaling;
    const obstacleSize = obstacle.getComponent(ƒ.ComponentMesh).mtxPivot.scaling;

    const collisionThresholdX = (carSize.x + obstacleSize.x) / 2;
    const collisionThresholdY = (carSize.y + obstacleSize.y) / 2;

    if (
      Math.abs(carPosition.x - obstaclePosition.x) < collisionThresholdX &&
      Math.abs(carPosition.y - obstaclePosition.y) < collisionThresholdY
    ) {
      // Collision detected   
      crashSound.play(true);
      const event: CustomEvent = new CustomEvent(EVENT_GAME_OVER);
      document.dispatchEvent(event);
    } else if (carPosition.y > obstaclePosition.y && !obstacle.passed) {
      carPassingSound.play(true);
      obstacle.passed = true; // Mark the obstacle as passed
      gameState.score++;
      gameState.finalScore = gameState.score;

    }

  }
  function handleGameOver(): void {
    // Stop the game loop
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


  function getRandomXValue(): number {
    const xValues: number[] = [1.5, 0.5, -0.5, -1.5];
    const randomIndex: number = Math.floor(Math.random() * xValues.length);
    return xValues[randomIndex];
  }

  function getRandomNumber(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }



  function createObstacle(): void {
    const obstacleTextures: ƒ.TextureImage[] = [
      new ƒ.TextureImage("Textures/Sign.png"),
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

    if (textureIndex === 0) {
      // Sign 
      obstacleSpeedModifier = 0.6;
      scaling = new ƒ.Vector3(0.8, 0.8, 1);
      isPulsing = true;
    } else if (textureIndex === 1) {
      // Pothole
      obstacleSpeedModifier = 0.6;
      scaling = new ƒ.Vector3(0.5, 0.5, 1); // Adjust the scale as needed
      isPulsing = false;
    } else if (textureIndex === 2) {
      // Truck
      obstacleSpeedModifier = 0.8;
      truckHornSound.play(true);
      scaling = new ƒ.Vector3(0.9, 2, 1); // Adjust the scale as needed
      isPulsing = true;
    } else if (textureIndex === 3) {
      // Car_Yellow
      obstacleSpeedModifier = 1;
      scaling = new ƒ.Vector3(0.8, 1.2, 1); // Adjust the scale as needed
      isPulsing = true;
    } else if (textureIndex === 4) {
      // Car_White
      obstacleSpeedModifier = 1.4;
      scaling = new ƒ.Vector3(0.8, 1.2, 1); // Adjust the scale as needed
      isPulsing = true;
    }

    const obstacle = new Obstacle(texture, scaling, obstacleSpeedModifier, isPulsing);
    obstacle.passed = false;



    /*
    let isValidPosition = false;
    let newXValue: number;
    const yRange = 5;
  
    while (!isValidPosition) {
      newXValue = getRandomXValue();
      isValidPosition = true;
  
      for (const obstacle of obstacles.getChildren()) {
        const obstaclePosition = obstacle.mtxLocal.translation;
        if (
          obstaclePosition.x === newXValue &&
          obstaclePosition.y >= obstacle.mtxLocal.translation.y - yRange &&
          obstaclePosition.y <= obstacle.mtxLocal.translation.y + yRange
        ) {
          isValidPosition = false;
          break;
        }
      }
    }
  */
    obstacle.mtxLocal.translation = new ƒ.Vector3(getRandomXValue(), getRandomNumber(7, 7), 0);
    obstacles.appendChild(obstacle);

    scheduleNextObstacleCreation();
  }



  function scheduleNextObstacleCreation(): void {
    const minInterval: number = 6 - (gameSpeed * 50); // Minimum interval in seconds
    const maxInterval: number = 10 - (gameSpeed) * 50; // Maximum interval in seconds
    const interval: number = getRandomNumber(minInterval, maxInterval); // Random interval in seconds
    console.log(interval);
    console.log("gameSpeed" + gameSpeed)
    // Wait for the interval and then create a random obstacle
    obstacleCreationTimeout = setTimeout(createObstacle, interval * 1000);
  }


  async function createRoadSprite(): Promise<ƒAid.NodeSprite> {
    let imgSpriteSheet: ƒ.TextureImage = new ƒ.TextureImage();
    await imgSpriteSheet.load("Textures/Road_bearbeitet.png");
    let coat: ƒ.CoatTextured = new ƒ.CoatTextured(undefined, imgSpriteSheet);
    let animation: ƒAid.SpriteSheetAnimation = new ƒAid.SpriteSheetAnimation("Highway", coat);
    animation.generateByGrid(ƒ.Rectangle.GET(0, 0, 280, 446), 2, 70, ƒ.ORIGIN2D.BOTTOMCENTER, ƒ.Vector2.X(280));
    let sprite: ƒAid.NodeSprite = new ƒAid.NodeSprite("Sprite");
    sprite.setAnimation(animation);
    sprite.setFrameDirection(-1);
    sprite.framerate = roadAnimationFramerate;

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
