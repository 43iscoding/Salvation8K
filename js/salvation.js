var GameState = function(game) {};

GameState.prototype.preload = function() {
    game.load.image('mainmenu','res/mainmenu.png');
    game.load.image('mainmenu','res/mainmenuDemo.png');
    game.load.image('noise.png', 'res/noise.png');
    game.load.spritesheet('pallete', 'res/pallete.png', 1, 1);
    game.load.spritesheet('planets', 'res/planet.png', 64, 64);
    game.load.spritesheet('overlays', 'res/planetOverlay.png', 64, 64);
    game.load.spritesheet('afterLevel', 'res/afterlevel.png', 300, 200);
};

var planets;

var planetPool;

var PLANET_TYPES = 12;

GameState.prototype.create = function() {
    game.physics.startSystem(Phaser.Physics.ARCADE);
    //init planets
    planetPool = initPlanetPool();
    planets = game.add.group();
    createPlanet(50, 50);
    createPlanet(200, 200);
};

function initPlanetPool() {
    var names = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    names = Phaser.Utils.shuffle(names);
    var pool = [];
    for (var i = 0; i < PLANET_TYPES; i++) {
        pool.push({name : names.pop(), sprite : i});
    }
    return Phaser.Utils.shuffle(pool);
}

function createPlanet(x, y) {
    var planet = planets.create(x, y, 'planets');
    var info = planetPool.pop();
    planet.name = info.name;
    planet.animations.add('idle', [info.sprite], 10, true);
    planet.animations.play('idle');
    planet.inputEnabled = true;
    planet.events.onInputDown.add(selectPlanet);
    return planet;
}

function selectPlanet(planet, pointer) {
    console.log(planet.name);
}

GameState.prototype.update = function() {

};

var game = new Phaser.Game(1136, 640, Phaser.AUTO, 'game');
game.state.add('game', GameState, true);

window.game = game;