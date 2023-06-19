"use strict";
var Script;
(function (Script) {
    var ƒ = FudgeCore;
    var ƒui = FudgeUserInterface;
    class GameState extends ƒ.Mutable {
        score = 0;
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
    let speed = new ƒ.Vector3(0, -0.001, 0);
    let carControl = new ƒ.Vector3(0, 0, 0);
    let road;
    let roadsprite;
    let carsprite;
    let gameState;
    let gameSpeed = 0.1;
    let roadAnimationFramerate = 4;
    let gameOver = false;
    let crashSound;
    let carPassingSound;
    let truckHornSound;
    let config;
    // Define custom event names
    const EVENT_GAME_OVER = "gameOver";
    class Obstacle extends ƒ.Node {
        passed = false;
        constructor(texture, scaling) {
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
            this.addComponent(new Script.PulseSign);
            // Add the obstacle to the obstacles node
            obstacles.appendChild(this);
        }
    }
    async function start(_event) {
        let response = await fetch("config.json");
        let config = await response.json();
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
        crashSound = graph.getChildrenByName("Sound")[0].getComponents(ƒ.ComponentAudio)[0];
        truckHornSound = graph.getChildrenByName("Sound")[0].getComponents(ƒ.ComponentAudio)[1];
        carPassingSound = graph.getChildrenByName("Sound")[0].getComponents(ƒ.ComponentAudio)[2];
        ƒ.Loop.addEventListener("loopFrame" /* LOOP_FRAME */, update);
        ƒ.Loop.start(); // start the game loop to continuously draw the viewport, update the audiosystem and drive the physics i/a
        // Create instances of obstacles
        createSignObstacle();
    }
    function update(_event) {
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
        gameSpeed = +0.001 * ƒ.Loop.timeFrameStartReal / 1000;
        // Update the speed of the signs 
        speed.y -= gameSpeed / 1000;
        gameState.carSpeed = Math.round(gameSpeed * 3600); // Convert gameSpeed to km/h
        // Assuming timeElapsed is given in milliseconds
        const timeElapsedinSeconds = ƒ.Loop.timeFrameReal / 1000;
        const distance = (gameState.carSpeed * timeElapsedinSeconds) / 3600; // Distance in kilometers
        gameState.distanceTraveled += distance;
        gameState.distanceTraveled = Number(gameState.distanceTraveled.toFixed(3));
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
        }
    }
    function handleGameOver() {
        // Stop the game loop
        ƒ.Loop.stop();
        gameOver = true;
        let gameOverScreen = document.querySelector("#gameOverScreen");
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
    function createSignObstacle() {
        const signTexture = new ƒ.TextureImage("Textures/Sign.png");
        const obstacle = new Obstacle(signTexture, new ƒ.Vector3(1, 1, 1));
        // Randomly set the x and y coordinates within a specific range
        obstacle.mtxLocal.translation = new ƒ.Vector3(getRandomXValue(), getRandomNumber(7, 7), 0);
        obstacles.appendChild(obstacle);
        scheduleNextSignCreation();
    }
    function scheduleNextSignCreation() {
        const minInterval = 5; // Minimum interval in seconds
        const maxInterval = 10; // Maximum interval in seconds
        const interval = getRandomNumber(minInterval, maxInterval); // Random interval in seconds
        // Wait for the interval and then create a sign obstacle
        setTimeout(createSignObstacle, interval * 1000);
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
    class PulseSign extends ƒ.ComponentScript {
        static iSubclass = ƒ.Component.registerSubclass(PulseSign);
        message = "CustomComponentScript added to ";
        originalScale = new ƒ.Vector2(1, 1);
        targetScale = new ƒ.Vector2(0.7, 0.7);
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
            const scaleFactor = 0.1 * (Math.sin(t * Math.PI) + 1);
            const interpolatedScale = new ƒ.Vector2(this.originalScale.x * (1 - scaleFactor) + this.targetScale.x * scaleFactor, this.originalScale.y * (1 - scaleFactor) + this.targetScale.y * scaleFactor);
            this.node.getComponent(ƒ.ComponentTransform).mtxLocal.scaling = new ƒ.Vector3(interpolatedScale.x, interpolatedScale.y, 1);
            if (this.timer >= this.pulseDuration) {
                this.timer -= this.pulseDuration;
            }
        };
    }
    Script.PulseSign = PulseSign;
})(Script || (Script = {}));
//# sourceMappingURL=Script.js.map