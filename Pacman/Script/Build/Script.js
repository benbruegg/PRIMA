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
    ƒ.Debug.info("Main Program Template running!");
    let viewport;
    let pacman;
    let speed = new ƒ.Vector3(0, 0, 0);
    document.addEventListener("interactiveViewportStarted", start);
    function start(_event) {
        viewport = _event.detail;
        let graph = viewport.getBranch();
        pacman = graph.getChildrenByName("Pacman")[0];
        console.log(graph);
        // pacman.mtxLocal.translate(new ƒ.Vector3(1, 1, 0));
        ƒ.Loop.addEventListener("loopFrame" /* LOOP_FRAME */, update);
        // tslint:disable-next-line: max-line-length
        ƒ.Loop.start(); // start the game loop to continously draw the viewport, update the audiosystem and drive the physics i/a
    }
    function update(_event) {
        // ƒ.Physics.simulate();  // if physics is included and used
        // tslint:disable-next-line: max-line-length
        if (!isWall(Math.round(pacman.mtxLocal.translation.x + 0.51), Math.round(pacman.mtxLocal.translation.y)) && ƒ.Keyboard.isPressedOne([ƒ.KEYBOARD_CODE.ARROW_RIGHT, ƒ.KEYBOARD_CODE.D]) && (pacman.mtxLocal.translation.y + 0.025) % 1 < 0.05) {
            speed.set(1 / 60, 0, 0);
        }
        // tslint:disable-next-line: max-line-length
        if (!isWall(Math.round(pacman.mtxLocal.translation.x - 0.51), Math.round(pacman.mtxLocal.translation.y)) && ƒ.Keyboard.isPressedOne([ƒ.KEYBOARD_CODE.ARROW_LEFT, ƒ.KEYBOARD_CODE.A]) && (pacman.mtxLocal.translation.y + 0.025) % 1 < 0.05) {
            speed.set(-1 / 60, 0, 0);
        }
        // tslint:disable-next-line: max-line-length
        if (!isWall(Math.round(pacman.mtxLocal.translation.x), Math.round(pacman.mtxLocal.translation.y + 0.51)) && ƒ.Keyboard.isPressedOne([ƒ.KEYBOARD_CODE.ARROW_UP, ƒ.KEYBOARD_CODE.W]) && (pacman.mtxLocal.translation.x + 0.025) % 1 < 0.05) {
            speed.set(0, 1 / 60, 0);
        }
        // tslint:disable-next-line: max-line-length
        if (!isWall(Math.round(pacman.mtxLocal.translation.x), Math.round(pacman.mtxLocal.translation.y - 0.51)) && ƒ.Keyboard.isPressedOne([ƒ.KEYBOARD_CODE.ARROW_DOWN, ƒ.KEYBOARD_CODE.S]) && (pacman.mtxLocal.translation.x + 0.025) % 1 < 0.05) {
            speed.set(0, -1 / 60, 0);
        }
        if (isWall(Math.round(pacman.mtxLocal.translation.x + 0.51), Math.round(pacman.mtxLocal.translation.y)) && Math.sign(speed.x) === 1) {
            speed.set(0, 0, 0);
        }
        if (isWall(Math.round(pacman.mtxLocal.translation.x - 0.51), Math.round(pacman.mtxLocal.translation.y)) && Math.sign(speed.x) === -1) {
            speed.set(0, 0, 0);
        }
        if (isWall(Math.round(pacman.mtxLocal.translation.x), Math.round(pacman.mtxLocal.translation.y + 0.51)) && Math.sign(speed.y) === 1) {
            speed.set(0, 0, 0);
        }
        if (isWall(Math.round(pacman.mtxLocal.translation.x), Math.round(pacman.mtxLocal.translation.y - 0.51)) && Math.sign(speed.y) === -1) {
            speed.set(0, 0, 0);
        }
        pacman.mtxLocal.translate(speed);
        viewport.draw();
        ƒ.AudioManager.default.update();
    }
    function isTile(_x, _y) {
        let graph = viewport.getBranch();
        let grid = graph.getChildrenByName("Grid")[0];
        // the row of the grid (y-direction)
        let row = grid.getChildren()[_y];
        // get the Element in x-direction
        console.log(row);
        if (row !== undefined) {
            let rowElement = row.getChild(_x);
            console.log(rowElement);
            if (rowElement !== undefined && row !== undefined) {
                console.log("Ist ein Feld");
                return true;
            }
        }
        else {
            console.log("Ist kein Feld");
            return false;
        }
        return false;
    }
    function isWall(_x, _y) {
        // get the Grid of all rows
        let graph = viewport.getBranch();
        let grid = graph.getChildrenByName("Grid")[0];
        console.log(isTile(_x, _y));
        if (isTile(_x, _y)) {
            // the row of the grid (y-direction)
            let row = grid.getChildren()[_y];
            // get the Element in x-direction
            let rowElement = row.getChild(_x);
            console.log(rowElement);
            let material = rowElement.getComponent(ƒ.ComponentMaterial);
            // get Element Color
            let color = material.clrPrimary;
            // get individual RGB values
            let clrR = color.r;
            let clrG = color.g;
            let clrB = color.b;
            console.log(clrR, clrG, clrB);
            if (clrR === 1 && clrG === 1 && clrB === 1) {
                console.log("Ist keine Wand");
                return false;
            }
        }
        console.log("Ist eine Wand");
        return true;
    }
})(Script || (Script = {}));
//# sourceMappingURL=Script.js.map