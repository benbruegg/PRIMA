# PRIMA

(In progress)
* Title: Highway Racer   
* Author: Benjamin Brüggemann
* Year and season (Summer, Winter): SoSe 23
* Curriculum and semester: MIB7
* Course this development was created in: PRIMA
* Docent: Prof. Dipl.-Ing. Jirka R. Dell'Oro-Friedl
* [Application Link](https://benbruegg.github.io/PRIMA/HighwayRacer/index.html) 
* [source code](https://github.com/benbruegg/PRIMA/tree/main/HighwayRacer)
* [design document / User Control, Interaction]()



## Checklist
		
| Nr | Criterion           | Explanation                                                                                                                                                                                                                                                                                                                                                                           |
|---:|---------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|  1 | Units and Positions | That setup was used because it comes in handy to place the users car on the 0 position so the distance to the right and left end of the highway are the same, also by using 1 as a step from lane to lane that made placing obstacles on the exact lanes easier.                                                                                                           |
|  2 | Hierarchy           | Graphs are set up like this:
   - Game
     - Obstacles 
     - Sound
     - Car 
       - Exhaust
     - Road
     - Landscape

   Like this, I keep an organized mostly self-explaining structure. The Car has a child in Exhaust handling some additional aspects of the car. Obstacles are only created at runtime and added to the Node Obstacles to be able to call them more easily, iterating through the Obstacles node, making obstacle handling way easier. The Road has a separate node as it is being animated by a spritesheet added at runtime, while Landscape just contains a basic background texture. The Sound node contains all sounds played in the game, as being a top-down 2D game, I didn't need any sound coming from different angles. This approach makes it easy to reference the nodes and their properties comfortably. |
|  3 | Editor              | The editor was used to build the basic node structure of the game, as seen above in the Graph part. Fixed nodes that only appear once in the game were created there, like the Car, Road, or Sound nodes. Textures that don't change, like the Car texture and the Landscape texture, were added in the editor. Also, for adding the sounds, I used the editor to turn the files (images or audio files) into resources and then added them to the node to later reference them in the code. Adding textures over the editor like this is much easier than in coding, saving a lot of code lines. Coding is then used mainly to create obstacles at random and the main gameplay logic like moving all the necessary nodes and handling the scenarios like collision checking, etc. Also, sprites like for the road or some created obstacles are generated by coding as that's not possible in the editor (at my current state).                                                                                                                          |
|  4 | Script Components   | I created a ComponentScript in a new file (Pulsing.ts) to then add it to my car node over the editor and also to every obstacle created at runtime where I had to add that script in the code then, (insert code line here when done). So, as I only used it in the editor on one node, it was not extremely useful and could have been done in the code as well.                                                                                                     |
|  5 | Extend              | All the obstacles created are of type FudgeCore.Node (code line). Also, the UI controller Interface class GameState is extending the Mutable class (code line). This proves very useful in both cases, as every obstacle needed to be able to be handled like a node in translation or adding components to it, while having its properties like the passed boolean that's needed to calculate the score accordingly and only count an object once when passed already, and an obstacleSpeedModifier to adjust the node's speed for each separate obstacle. |
|  6 | Sound               | Sounds are, as explained in the Graph section, attached to one local Sounds node as it's a top-down 2D game, there was no need to add them to different nodes and have them perceived from different spots. There are sounds for different events or situations like:
   - Car engine sound of the user car
   - Passing sound when passing by an obstacle
   - Crashing sound when colliding
   - Some obstacle-specific sounds                                                                                                                                                                                                                                                                                       |
|  7 | VUI                 | Interface Controller class used in my GameState.ts extending the Mutable class as explained under Extend. The interface shows different values at runtime like:
   - The Score (counts up 1 for every obstacle passed)
   - The current speed of the car (in km/h)
   - Distance travelled by the car (in km)
   
   Also, there is a game over window showing the final score and giving the option to restart the game, which only shows when a collision occurred and the game has ended.                                                                                                                                               |
|  8 | Event System        | Apart from the common DOM event system used in several occasions, I used the fudge Event System in the following scenarios:
   - In the collision detection logic, whenever a collision is detected, the car node dispatches an event together with information about the node it collided with (which was not used in the end) (code line). The event travels up the graph to be able to be handled on the graph node and leads to handling it with a gameOver function.                                                                                                                                                     |
|  9 | External Data       | The config.json, which is read by the Interface Config set up in Main.ts, includes some variables to test and mainly makes balancing and debugging more easily accessible by changing these values in the config file. Values set are:
   - gameSpeed (influencing the speed of the game as a whole, by influencing the speed of the obstacles traversing, the sprite framerate of the road, and the intervals obstacles are created over time)
   - obstacleSpeed (sets the speed of the obstacles in the y direction at the start of the game, still being increased over time influenced by the gameSpeed)

   Choosing these two values against each other, especially for balancing the perception of how fast the car and obstacles are moving and the speed in km/h in the UI compares to the perception.                                                                                                                                              |
|  A | Light               | As it's a simple 2D game, I just used ShaderLit and ShaderLitTextured to create already lit materials of all the objects in the game, without using spotlights or any other lighting choices. The game is supposed to take part in the open on the road in a consistently lit comic-styled 2D scene, which makes the use of ShaderLit sufficient.                                                                                       |
|  B | Physics             | Physics wasn't used in the game as, for a simple 2D game, I used simple collision detection by comparing x and y values.                                                                                                                                                                                                                                                                |
|  C | Net                 | Multiplayer not needed, as it's meant to be a single-player game, therefore not included.                                                                                                                                                                                                                                                                                           |
|  D | State Machines      | State Machines haven't been used.                                                                                                                                                                                                                                                                                                                                                   |
|  E | Animation           | Sprites are used for several animations in the game:
   - The road is generated with a sprite, so it appears like the user is moving along it, getting faster over time by increasing its framerate (code lines).
   - The exhaust of the car to generate some smoke when the car is driving forward (code lines).
   - The police car obstacle to animate its siren lights (code lines).
