namespace Script {
  import ƒ = FudgeCore;
  import ƒAid = FudgeAid;

  document.addEventListener("interactiveViewportStarted", <EventListener><unknown>start);
  ƒ.Debug.info("Main Program Template running!");


  interface Config {
    drain: number;
  }

  let viewport: ƒ.Viewport;
  let car: ƒ.Node;
  let obstacles: ƒ.Node;
  let speed: ƒ.Vector3 = new ƒ.Vector3(0, -0.001, 0);
  let carControl: ƒ.Vector3 = new ƒ.Vector3(0, 0, 0);
  let road: ƒ.Node;
  let roadsprite: ƒAid.NodeSprite;
  let carsprite: ƒAid.NodeSprite;
  let gameState: GameState;
  let gameSpeed: number = 0.1;
  let roadAnimationFramerate: number = 4;
  let gameOver: boolean = false;
  let crashSound: ƒ.ComponentAudio;
  let carPassingSound: ƒ.ComponentAudio;
  let truckHornSound: ƒ.ComponentAudio;
  let config: Config;


  // Define custom event names
  const EVENT_GAME_OVER: string = "gameOver";

  class Obstacle extends ƒ.Node {

    public passed: boolean = false; 

    constructor(texture: ƒ.TextureImage, scaling: ƒ.Vector3) {
      super("Obstacle");

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

      this.addComponent(new PulseSign);

      // Add the obstacle to the obstacles node
      obstacles.appendChild(this);
    }

  }

    async function start(_event: CustomEvent): Promise<void> {
    let response: Response = await fetch("config.json");
    let config: Config = await response.json();
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

    crashSound = graph.getChildrenByName("Sound")[0].getComponents(ƒ.ComponentAudio)[0];
    truckHornSound = graph.getChildrenByName("Sound")[0].getComponents(ƒ.ComponentAudio)[1];
    carPassingSound = graph.getChildrenByName("Sound")[0].getComponents(ƒ.ComponentAudio)[2];

    ƒ.Loop.addEventListener(ƒ.EVENT.LOOP_FRAME, update);
    ƒ.Loop.start();  // start the game loop to continuously draw the viewport, update the audiosystem and drive the physics i/a

    // Create instances of obstacles
    createSignObstacle();
  }

  function update(_event: Event): void {
    if (gameOver)
      return;

    if (car.mtxLocal.translation.x < 1.5 && ƒ.Keyboard.isPressedOne([ƒ.KEYBOARD_CODE.ARROW_RIGHT, ƒ.KEYBOARD_CODE.D])) {
      carControl.set(0.03, 0, 0);
    }
    else if (car.mtxLocal.translation.x > -1.5 && ƒ.Keyboard.isPressedOne([ƒ.KEYBOARD_CODE.ARROW_LEFT, ƒ.KEYBOARD_CODE.A])) {
      carControl.set(-0.03, 0, 0);
    }
    else if (car.mtxLocal.translation.y > 0.55 && ƒ.Keyboard.isPressedOne([ƒ.KEYBOARD_CODE.ARROW_DOWN, ƒ.KEYBOARD_CODE.S])) {
      carControl.set(0, -0.03, 0);
    }
    else if (car.mtxLocal.translation.y < 5.8 && ƒ.Keyboard.isPressedOne([ƒ.KEYBOARD_CODE.ARROW_UP, ƒ.KEYBOARD_CODE.W])) {
      carControl.set(0, 0.03, 0);
    }
    else {
      carControl.set(0, 0, 0);
    }


    // Move the signs and check for collisions
    for (const obstacle of obstacles.getChildren()) {
      obstacle.mtxLocal.translate(speed);
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
    gameSpeed = + 0.001 * ƒ.Loop.timeFrameStartReal / 1000;

    // Update the speed of the signs 
    speed.y -= gameSpeed / 1000;

    gameState.carSpeed = Math.round(gameSpeed * 3600); // Convert gameSpeed to km/h
    // Assuming timeElapsed is given in milliseconds

    const timeElapsedinSeconds: number = ƒ.Loop.timeFrameReal / 1000;
    const distance: number = (gameState.carSpeed * timeElapsedinSeconds) / 3600; // Distance in kilometers
    gameState.distanceTraveled += distance;

    gameState.distanceTraveled = Number(gameState.distanceTraveled.toFixed(3));

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
      
    } 
    
  }
  function handleGameOver(): void {
    // Stop the game loop
    ƒ.Loop.stop();
    gameOver = true;
    let gameOverScreen: HTMLDivElement = document.querySelector("#gameOverScreen");
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

  function createSignObstacle(): void {
    const signTexture: ƒ.TextureImage = new ƒ.TextureImage("Textures/Sign.png");
    const obstacle: Obstacle = new Obstacle(signTexture, new ƒ.Vector3(1, 1, 1));
    // Randomly set the x and y coordinates within a specific range
    obstacle.mtxLocal.translation = new ƒ.Vector3(getRandomXValue(), getRandomNumber(7, 7), 0);
    obstacles.appendChild(obstacle);

    scheduleNextSignCreation();
  }

  function scheduleNextSignCreation(): void {
    const minInterval: number = 5; // Minimum interval in seconds
    const maxInterval: number = 10; // Maximum interval in seconds
    const interval: number = getRandomNumber(minInterval, maxInterval); // Random interval in seconds

    // Wait for the interval and then create a sign obstacle
    setTimeout(createSignObstacle, interval * 1000);
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
