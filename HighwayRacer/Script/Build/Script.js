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
    var ƒui = FudgeUserInterface;
    class GameState extends ƒ.Mutable {
        score = 0;
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
    const collisionThreshold = 0.5; // Adjust this value to set the collision threshold
    // Define custom event names
    const EVENT_GAME_OVER = "gameOver";
    class Obstacle extends ƒ.Node {
        passed = false; // Add a passed property to track if the obstacle has been passed
        constructor(texture, spinning) {
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
    async function start(_event) {
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
        ƒ.Loop.addEventListener("loopFrame" /* LOOP_FRAME */, update);
        ƒ.Loop.start(); // start the game loop to continuously draw the viewport, update the audiosystem and drive the physics i/a
        // Create instances of obstacles
        createSignObstacle();
    }
    function update(_event) {
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
        gameSpeed = +0.001 * ƒ.Loop.timeFrameReal / 1000;
        // Update the speed of the signs
        speed.y -= gameSpeed;
        roadAnimationFramerate += gameSpeed;
        roadsprite.framerate = roadAnimationFramerate;
        car.mtxLocal.translate(carControl);
        viewport.draw();
        ƒ.AudioManager.default.update();
    }
    function checkCollision(car, obstacle) {
        const carPosition = car.mtxLocal.translation;
        const obstaclePosition = obstacle.mtxLocal.translation;
        if (Math.abs(carPosition.x - obstaclePosition.x) < collisionThreshold &&
            Math.abs(carPosition.y - obstaclePosition.y) < collisionThreshold &&
            Math.abs(carPosition.z - obstaclePosition.z) < collisionThreshold) {
            const event = new CustomEvent(EVENT_GAME_OVER);
            document.dispatchEvent(event);
        }
        else if (carPosition.y > obstaclePosition.y && !obstacle.passed) {
            obstacle.passed = true; // Mark the obstacle as passed
            gameState.score++;
            console.log("Score:", gameState.score);
            // Play sound effect or perform other actions
        }
    }
    function handleGameOver() {
        // Stop the game loop
        let gameOverScreen = document.querySelector("#gameOverScreen");
        gameOverScreen.style.display = "block";
        ƒ.Loop.stop();
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
        const obstacle = new Obstacle(signTexture, false); // Set spinning to false for signs
        // Set the position, rotation, or any other properties specific to each obstacle instance
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
//# sourceMappingURL=Script.js.map