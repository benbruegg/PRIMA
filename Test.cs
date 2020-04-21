///<reference types="Fudge\FudgeCore.js"/>
namespace ExampleSceneForest {
    import f = FudgeCore;
    window.addEventListener("DOMContentLoaded", init);

    function init(): void {
        f.RenderManager.initialize();
    }
}