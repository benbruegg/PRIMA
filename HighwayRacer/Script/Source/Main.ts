namespace Script {
  import ƒ = FudgeCore;
  import ƒAid = FudgeAid;

  document.addEventListener("interactiveViewportStarted", <EventListener><unknown>start);
  ƒ.Debug.info("Main Program Template running!");
  let viewport: ƒ.Viewport;
  let car: ƒ.Node;
  let obstacles: ƒ.Node;
  let speed: ƒ.Vector3 = new ƒ.Vector3(0, -0.01, 0);
  let carControl: ƒ.Vector3 = new ƒ.Vector3(0, 0, 0);
  let road: ƒ.Node;
  let roadsprite: ƒAid.NodeSprite;
  let carsprite: ƒAid.NodeSprite;
  let gameState: GameState;


  const collisionThreshold: number = 0.5; // Adjust this value to set the collision threshold
  // Define custom event names
  const EVENT_GAME_OVER: string = "gameOver";

  class Obstacle extends ƒ.Node {
    constructor(texture: ƒ.TextureImage, spinning: boolean) {
      super("Obstacle");

      this.addComponent(new ƒ.ComponentTransform());
      let mesh = new ƒ.MeshSprite();
      this.addComponent(new ƒ.ComponentMesh(mesh));

      let textureImage = new ƒ.TextureImage();
      textureImage.image = texture.image;

      let material = new ƒ.Material("ObstacleMaterial", ƒ.ShaderLitTextured, new ƒ.CoatTextured(new ƒ.Color(1, 1, 1, 1), textureImage));
      let cmpMaterial = new ƒ.ComponentMaterial(material);
      this.addComponent(cmpMaterial);

      // Add the obstacle to the obstacles node
      obstacles.appendChild(this);
    }

  }

  async function start(_event: CustomEvent): Promise<void> {
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



    ƒ.Loop.addEventListener(ƒ.EVENT.LOOP_FRAME, update);
    ƒ.Loop.start();  // start the game loop to continuously draw the viewport, update the audiosystem and drive the physics i/a

    // Create instances of obstacles
    createSignObstacle();
  }

  function update(_event: Event): void {
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

    // Update the speed of the signs
    speed.y -= 0.001 * ƒ.Loop.timeFrameReal / 1000;

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
      // ...

      // Check for collision with the car
      checkCollision(car, obstacle);

      gameState.score =+1; 
    }

    car.mtxLocal.translate(carControl);
    viewport.draw();
    ƒ.AudioManager.default.update();
  }

  function checkCollision(car: ƒ.Node, obstacle: ƒ.Node): void {
    const carPosition = car.mtxLocal.translation;
    const obstaclePosition = obstacle.mtxLocal.translation;
    if (
      Math.abs(carPosition.x - obstaclePosition.x) < collisionThreshold &&
      Math.abs(carPosition.y - obstaclePosition.y) < collisionThreshold &&
      Math.abs(carPosition.z - obstaclePosition.z) < collisionThreshold
    ) {
      const event: CustomEvent = new CustomEvent(EVENT_GAME_OVER);
      document.dispatchEvent(event);
    }
  }

  function handleGameOver(): void {
    // Stop the game loop
    ƒ.Loop.stop();

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
    const obstacle: Obstacle = new Obstacle(signTexture, false); // Set spinning to false for signs
    // Set the position, rotation, or any other properties specific to each obstacle instance
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
