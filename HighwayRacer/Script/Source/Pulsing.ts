namespace Script {
  import ƒ = FudgeCore;
  ƒ.Project.registerScriptNamespace(Script);

  export class Pulsing extends ƒ.ComponentScript {
    public static readonly iSubclass: number = ƒ.Component.registerSubclass(Pulsing);
    public originalScale: ƒ.Vector2 = new ƒ.Vector2(1, 1);
    public targetScale: ƒ.Vector2 = new ƒ.Vector2(0.9, 0.9);
    public pulseDuration: number = 1; // Duration of one pulsation cycle in seconds
    public timer: number = 0; // Timer to track the pulsation duration

    constructor() {
      super();

      if (ƒ.Project.mode == ƒ.MODE.EDITOR)
        return;

      this.addEventListener(ƒ.EVENT.COMPONENT_ADD, this.hndEvent);
      this.addEventListener(ƒ.EVENT.COMPONENT_REMOVE, this.hndEvent);
      this.addEventListener(ƒ.EVENT.NODE_DESERIALIZED, this.hndEvent);
    }

    public hndEvent = (_event: Event): void => {
      switch (_event.type) {
        case ƒ.EVENT.COMPONENT_ADD:
          this.startPulsation();
          break;
        case ƒ.EVENT.COMPONENT_REMOVE:
          this.removeEventListener(ƒ.EVENT.COMPONENT_ADD, this.hndEvent);
          this.removeEventListener(ƒ.EVENT.COMPONENT_REMOVE, this.hndEvent);
          break;
        case ƒ.EVENT.NODE_DESERIALIZED:
          // If deserialized, the node is now fully reconstructed and access to all its components and children is possible
          break;
      }
    }

    private startPulsation(): void {
      ƒ.Loop.addEventListener(ƒ.EVENT.LOOP_FRAME, this.update);
    }

    private update = (): void => {
      const deltaTime: number = ƒ.Loop.timeFrameStartReal / 1000;

      this.timer += deltaTime;
      const t: number = this.timer / this.pulseDuration;
      const scaleFactor: number = 0.07 * (Math.sin(t * Math.PI) + 1);

      const interpolatedScale: ƒ.Vector2 = new ƒ.Vector2(
        this.originalScale.x * (1 - scaleFactor) + this.targetScale.x * scaleFactor,
        this.originalScale.y * (1 - scaleFactor) + this.targetScale.y * scaleFactor
      );

      this.node.getComponent(ƒ.ComponentTransform).mtxLocal.scaling = new ƒ.Vector3(interpolatedScale.x, interpolatedScale.y, 1);

      if (this.timer >= this.pulseDuration) {
        this.timer -= this.pulseDuration;
      }
    }
  }
}
