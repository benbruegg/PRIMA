namespace Script {
  import ƒ = FudgeCore;
  ƒ.Debug.info("Main Program Template running!");

  let viewport: ƒ.Viewport;
  let avatar: ƒ.Node;
  let cmpCamera: ƒ.ComponentCamera;
  let speedRotY: number = -0.1;
  let speedRotX: number = 0.2;
  let rotationX: number = 0;
  let cntWalk: ƒ.Control = new ƒ.Control("cntWalk", 3.5, ƒ.CONTROL_TYPE.PROPORTIONAL);
  cntWalk.setDelay(500);
  let cntStrafe: ƒ.Control = new ƒ.Control("cntStrafe", 3, ƒ.CONTROL_TYPE.PROPORTIONAL);
  cntStrafe.setDelay(500);
  document.addEventListener("interactiveViewportStarted", <EventListener>start);

  function start(_event: CustomEvent): void {
    viewport = _event.detail;
    avatar = viewport.getBranch().getChildrenByName("Avatar")[0];
    viewport.camera = cmpCamera = avatar.getChild(0).getComponent(ƒ.ComponentCamera);
    console.log(avatar);

    viewport.getCanvas().addEventListener("pointermove", hndPointerMove);
    ƒ.Loop.addEventListener(ƒ.EVENT.LOOP_FRAME, update);
    ƒ.Loop.start();  // start the game loop to continously draw the viewport, update the audiosystem and drive the physics i/a
  }

  function update(_event: Event): void {
    // ƒ.Physics.simulate();  // if physics is included and used
    controlWalk();
    controlStrafe();
    viewport.draw();
    ƒ.AudioManager.default.update();
  }

  function controlWalk(): void {
    // tslint:disable-next-line: max-line-length
    let input: number = ƒ.Keyboard.mapToTrit([ƒ.KEYBOARD_CODE.W, ƒ.KEYBOARD_CODE.ARROW_UP], [ƒ.KEYBOARD_CODE.S, ƒ.KEYBOARD_CODE.ARROW_DOWN]);
    cntWalk.setInput(input);
    avatar.mtxLocal.translateZ(cntWalk.getOutput() * ƒ.Loop.timeFrameGame / 1000);
  }

  function controlStrafe(): void {
    // tslint:disable-next-line: max-line-length
    let input: number = ƒ.Keyboard.mapToTrit([ƒ.KEYBOARD_CODE.A, ƒ.KEYBOARD_CODE.ARROW_LEFT], [ƒ.KEYBOARD_CODE.D, ƒ.KEYBOARD_CODE.ARROW_RIGHT]);
    cntStrafe.setInput(input);
    avatar.mtxLocal.translateX(cntStrafe.getOutput() * ƒ.Loop.timeFrameGame / 1000);

  }

  function hndPointerMove(_event: PointerEvent): void {
   avatar.mtxLocal.rotateY(_event.movementX * speedRotY);
   rotationX += _event.movementY * speedRotX;
   rotationX = Math.min(60, Math.max(-60, rotationX));
   cmpCamera.mtxPivot.rotation = ƒ.Vector3.X(rotationX);
  }
}