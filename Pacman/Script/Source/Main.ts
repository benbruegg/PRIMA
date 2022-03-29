namespace Script {
  import ƒ = FudgeCore;
  ƒ.Debug.info("Main Program Template running!");
  let viewport: ƒ.Viewport;
  let pacman: ƒ.Node;
  let speed: ƒ.Vector3 = new ƒ.Vector3(0, 0, 0);
  document.addEventListener("interactiveViewportStarted", <EventListener>start);

  function start(_event: CustomEvent): void {
    viewport = _event.detail;

    console.log(viewport.camera);

    viewport.camera.mtxPivot.translate(new ƒ.Vector3(2,2,15));
    viewport.camera.mtxPivot.rotateY(180, false);

    let graph: ƒ.Node = viewport.getBranch();
    pacman = graph.getChildrenByName("Pacman")[0];
    console.log(graph);
    // pacman.mtxLocal.translate(new ƒ.Vector3(1, 1, 0));


    ƒ.Loop.addEventListener(ƒ.EVENT.LOOP_FRAME, update);
    // tslint:disable-next-line: max-line-length
    ƒ.Loop.start();  // start the game loop to continously draw the viewport, update the audiosystem and drive the physics i/a
  }

  function update(_event: Event): void {
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
    // ƒ.AudioManager.default.update();
  }
  function isTile(_x: number, _y: number): boolean {
    let graph: ƒ.Node = viewport.getBranch();
    let grid: ƒ.Node = graph.getChildrenByName("Grid")[0];

    // the row of the grid (y-direction)
    let row: ƒ.Node = grid.getChildren()[_y];
    // get the Element in x-direction
    console.log(row);
    if (row !== undefined) {
    let rowElement: ƒ.Node = row.getChild(_x);
    console.log(rowElement);
    if (rowElement !== undefined && row !== undefined) {
      console.log("Ist ein Feld");
      return true;
    }
    } else {
      console.log("Ist kein Feld");
      return false;
    }
    return false;
  }
  function isWall(_x: number, _y: number): boolean {
    // get the Grid of all rows
    let graph: ƒ.Node = viewport.getBranch();
    let grid: ƒ.Node = graph.getChildrenByName("Grid")[0];
    console.log(isTile(_x, _y));
    if (isTile(_x, _y)) {
      // the row of the grid (y-direction)
      let row: ƒ.Node = grid.getChildren()[_y];
      // get the Element in x-direction
      let rowElement: ƒ.Node = row.getChild(_x);
      console.log(rowElement);
      let material: ƒ.ComponentMaterial = rowElement.getComponent(ƒ.ComponentMaterial);
      // get Element Color
      let color: ƒ.Color = material.clrPrimary;
      // get individual RGB values
      let clrR: number = color.r;
      let clrG: number = color.g;
      let clrB: number = color.b;
      console.log(clrR, clrG, clrB);
      if (clrR === 1 && clrG === 1 && clrB === 1) {
        console.log("Ist keine Wand");
        return false;
      }
    }
    console.log("Ist eine Wand");
    return true;
  }
}


