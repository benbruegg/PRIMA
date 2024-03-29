declare namespace Script {
    import ƒ = FudgeCore;
    class GameState extends ƒ.Mutable {
        score: number;
        finalScore: number;
        carSpeed: number;
        carSpeedRange: number;
        distanceTraveled: number;
        constructor();
        protected reduceMutator(_mutator: ƒ.Mutator): void;
    }
}
declare namespace Script {
}
declare namespace Script {
    import ƒ = FudgeCore;
    class Pulsing extends ƒ.ComponentScript {
        static readonly iSubclass: number;
        originalScale: ƒ.Vector2;
        targetScale: ƒ.Vector2;
        pulseDuration: number;
        timer: number;
        constructor();
        hndEvent: (_event: Event) => void;
        private startPulsation;
        private update;
    }
}
