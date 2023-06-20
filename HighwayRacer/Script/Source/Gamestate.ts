namespace Script {
import ƒ = FudgeCore;
import ƒui = FudgeUserInterface;

export class GameState extends ƒ. Mutable {
    public score: number = 0;
    public finalScore: number = 0;
    public carSpeed: number = 0; 
    public distanceTraveled: number = 0;
    
    public constructor() {
    super();
    let domHud: HTMLDivElement = document.querySelector("div#vui");
    console.log(new ƒui.Controller(this, domHud));
    }

    protected reduceMutator(_mutator: ƒ.Mutator): void {/* */ }
}

}