"use strict";
var Script;
(function (Script) {
    var ƒ = FudgeCore;
    var ƒui = FudgeUserInterface;
    class GameState extends ƒ.Mutable {
        score = 0;
        finalScore = 0;
        carSpeed = 0;
        distanceTraveled = 0;
        constructor() {
            super();
            let domHud = document.querySelector("div#vui");
            console.log(new ƒui.Controller(this, domHud));
        }
        reduceMutator(_mutator) { }
    }
    Script.GameState = GameState;
})(Script || (Script = {}));
var Script;
(function (Script) {
    var ƒ = FudgeCore;
    var ƒAid = FudgeAid;
    document.addEventListener("interactiveViewportStarted", start);
    ƒ.Debug.info("Main Program Template running!");
    let viewport;
    let car;
    let obstacles;
    let obstacleSpeed;
    let carControl = new ƒ.Vector3(0, 0, 0);
    let road;
    let roadsprite;
    let carsprite;
    let gameState;
    let gameSpeed;
    let roadAnimationFramerate = 4;
    let gameOver = false;
    let engineSound;
    let crashSound;
    let carPassingSound;
    let truckHornSound;
    let obstacleCreated = false;
    let obstacleCreationTimeout;
    let config;
    // declare Game Over Event
    const EVENT_GAME_OVER = "gameOver";
    //Class to define obstacles as nodes
    class Obstacle extends ƒ.Node {
        passed = false;
        constructor(texture, scaling, obstacleSpeedModifier, isPulsing) {
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
                this.addComponent(new Script.Pulsing());
            }
            obstacles.appendChild(this);
        }
    }
    async function start(_event) {
        let response = await fetch("config.json");
        let config = await response.json();
        gameSpeed = config.gameSpeed;
        obstacleSpeed = config.obstacleSpeed;
        viewport = _event.detail;
        viewport.camera.attachToNode(road);
        viewport.camera.mtxPivot.translate(new ƒ.Vector3(0, 3.185, -10.9));
        viewport.camera.mtxPivot.rotateY(180, true);
        gameState = new Script.GameState();
        // Listen for the game over event
        document.addEventListener(EVENT_GAME_OVER, handleGameOver);
        let graph = viewport.getBranch();
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
        ƒ.Loop.addEventListener("loopFrame" /* LOOP_FRAME */, update);
        ƒ.Loop.start(); // start the game loop to continuously draw the viewport, update the audiosystem and drive the physics i/a
    }
    function update(_event) {
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
            let obstacleSpeedModifier = obstacle["obstacleSpeedModifier"];
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
        const timeElapsedinSeconds = ƒ.Loop.timeFrameReal / 1000;
        const distance = (gameState.carSpeed * timeElapsedinSeconds) / 3600; // Distance in kilometers
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
    function checkCollision(car, obstacle) {
        const carPosition = car.mtxLocal.translation;
        const obstaclePosition = obstacle.mtxLocal.translation;
        const carSize = car.getComponent(ƒ.ComponentMesh).mtxPivot.scaling;
        const obstacleSize = obstacle.getComponent(ƒ.ComponentMesh).mtxPivot.scaling;
        const collisionThresholdX = (carSize.x + obstacleSize.x) / 2;
        const collisionThresholdY = (carSize.y + obstacleSize.y) / 2;
        if (Math.abs(carPosition.x - obstaclePosition.x) < collisionThresholdX &&
            Math.abs(carPosition.y - obstaclePosition.y) < collisionThresholdY) {
            // Collision detected   
            crashSound.play(true);
            const event = new CustomEvent(EVENT_GAME_OVER);
            document.dispatchEvent(event);
        }
        else if (carPosition.y > obstaclePosition.y && !obstacle.passed) {
            carPassingSound.play(true);
            obstacle.passed = true; // Mark the obstacle as passed
            gameState.score++;
            gameState.finalScore = gameState.score;
        }
    }
    function handleGameOver() {
        // Stop the game loop
        ƒ.Loop.stop();
        clearTimeout(obstacleCreationTimeout);
        engineSound.play(false);
        gameOver = true;
        let gameOverScreen = document.querySelector("#gameOverScreen");
        let vui = document.querySelector("#vui");
        vui.style.cursor = "auto";
        gameOverScreen.style.display = "block";
        console.log("Game Over");
    }
    function getRandomXValue() {
        const xValues = [1.5, 0.5, -0.5, -1.5];
        const randomIndex = Math.floor(Math.random() * xValues.length);
        return xValues[randomIndex];
    }
    function getRandomNumber(min, max) {
        return Math.random() * (max - min) + min;
    }
    function createObstacle() {
        const obstacleTextures = [
            new ƒ.TextureImage("Textures/Sign.png"),
            new ƒ.TextureImage("Textures/Pothole.png"),
            new ƒ.TextureImage("Textures/Truck.png"),
            new ƒ.TextureImage("Textures/Car_Yellow.png"),
            new ƒ.TextureImage("Textures/Car_White.png")
        ];
        const textureIndex = Math.floor(Math.random() * obstacleTextures.length);
        const texture = obstacleTextures[textureIndex];
        let scaling;
        let isPulsing;
        let obstacleSpeedModifier;
        if (textureIndex === 0) {
            // Sign 
            obstacleSpeedModifier = 0.6;
            scaling = new ƒ.Vector3(0.8, 0.8, 1);
            isPulsing = true;
        }
        else if (textureIndex === 1) {
            // Pothole
            obstacleSpeedModifier = 0.6;
            scaling = new ƒ.Vector3(0.5, 0.5, 1); // Adjust the scale as needed
            isPulsing = false;
        }
        else if (textureIndex === 2) {
            // Truck
            obstacleSpeedModifier = 0.8;
            truckHornSound.play(true);
            scaling = new ƒ.Vector3(0.9, 2, 1); // Adjust the scale as needed
            isPulsing = true;
        }
        else if (textureIndex === 3) {
            // Car_Yellow
            obstacleSpeedModifier = 1;
            scaling = new ƒ.Vector3(0.8, 1.2, 1); // Adjust the scale as needed
            isPulsing = true;
        }
        else if (textureIndex === 4) {
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
    function scheduleNextObstacleCreation() {
        const minInterval = 6 - (gameSpeed * 50); // Minimum interval in seconds
        const maxInterval = 10 - (gameSpeed) * 50; // Maximum interval in seconds
        const interval = getRandomNumber(minInterval, maxInterval); // Random interval in seconds
        console.log(interval);
        console.log("gameSpeed" + gameSpeed);
        // Wait for the interval and then create a random obstacle
        obstacleCreationTimeout = setTimeout(createObstacle, interval * 1000);
    }
    async function createRoadSprite() {
        let imgSpriteSheet = new ƒ.TextureImage();
        await imgSpriteSheet.load("Textures/Road_bearbeitet.png");
        let coat = new ƒ.CoatTextured(undefined, imgSpriteSheet);
        let animation = new ƒAid.SpriteSheetAnimation("Highway", coat);
        animation.generateByGrid(ƒ.Rectangle.GET(0, 0, 280, 446), 2, 70, ƒ.ORIGIN2D.BOTTOMCENTER, ƒ.Vector2.X(280));
        let sprite = new ƒAid.NodeSprite("Sprite");
        sprite.setAnimation(animation);
        sprite.setFrameDirection(-1);
        sprite.framerate = roadAnimationFramerate;
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
var Script;
(function (Script) {
    var ƒ = FudgeCore;
    ƒ.Project.registerScriptNamespace(Script);
    class Pulsing extends ƒ.ComponentScript {
        static iSubclass = ƒ.Component.registerSubclass(Pulsing);
        message = "CustomComponentScript added to ";
        originalScale = new ƒ.Vector2(0.8, 0.8);
        targetScale = new ƒ.Vector2(0.6, 0.6);
        pulseDuration = 1; // Duration of one pulsation cycle in seconds
        timer = 0; // Timer to track the pulsation duration
        constructor() {
            super();
            if (ƒ.Project.mode == ƒ.MODE.EDITOR)
                return;
            this.addEventListener("componentAdd" /* COMPONENT_ADD */, this.hndEvent);
            this.addEventListener("componentRemove" /* COMPONENT_REMOVE */, this.hndEvent);
            this.addEventListener("nodeDeserialized" /* NODE_DESERIALIZED */, this.hndEvent);
        }
        hndEvent = (_event) => {
            switch (_event.type) {
                case "componentAdd" /* COMPONENT_ADD */:
                    ƒ.Debug.log(this.message, this.node);
                    this.startPulsation();
                    break;
                case "componentRemove" /* COMPONENT_REMOVE */:
                    this.removeEventListener("componentAdd" /* COMPONENT_ADD */, this.hndEvent);
                    this.removeEventListener("componentRemove" /* COMPONENT_REMOVE */, this.hndEvent);
                    break;
                case "nodeDeserialized" /* NODE_DESERIALIZED */:
                    // If deserialized, the node is now fully reconstructed and access to all its components and children is possible
                    break;
            }
        };
        startPulsation() {
            ƒ.Loop.addEventListener("loopFrame" /* LOOP_FRAME */, this.update);
        }
        update = () => {
            const deltaTime = ƒ.Loop.timeFrameStartReal / 1000;
            this.timer += deltaTime;
            const t = this.timer / this.pulseDuration;
            const scaleFactor = 0.07 * (Math.sin(t * Math.PI) + 1);
            const interpolatedScale = new ƒ.Vector2(this.originalScale.x * (1 - scaleFactor) + this.targetScale.x * scaleFactor, this.originalScale.y * (1 - scaleFactor) + this.targetScale.y * scaleFactor);
            this.node.getComponent(ƒ.ComponentTransform).mtxLocal.scaling = new ƒ.Vector3(interpolatedScale.x, interpolatedScale.y, 1);
            if (this.timer >= this.pulseDuration) {
                this.timer -= this.pulseDuration;
            }
        };
    }
    Script.Pulsing = Pulsing;
})(Script || (Script = {}));
//# sourceMappingURL=Script.js.map