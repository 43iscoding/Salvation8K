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
    selected = null;
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
    planet.events.onInputDown.add(onPlanetClick);
    planet.events.onInputOver.add(onPlanetHover);
    planet.events.onInputOut.add(onPlanetOut);
    var overlay = game.add.sprite(x, y, 'overlays');
    overlay.animations.add('dying', [0,1,2,3], 10, false);
    overlay.animations.add('hover', [4], 10, true);
    overlay.animations.add('selected', [5], 10, true);
    overlay.animations.add('idle', [6], 10, true);
    overlay.animations.play('idle');
    planet.overlay = overlay;
    return planet;
}

var selected = null;

function onPlanetClick(planet, pointer) {
    planets.forEach(function(planet) {
        planet.overlay.animations.play('idle');
    }, this);
    planet.overlay.animations.play('selected');
    selected = planet;
}

function onPlanetHover(planet, pointer) {
    if (planet == selected) return;
    planet.overlay.animations.play('hover');
}

function onPlanetOut(planet, pointer) {
    if (planet == selected) return;
    planet.overlay.animations.play('idle');
}

GameState.prototype.update = function() {

};

GameState.prototype.render = function() {
    game.debug.text('Selected: ' + (selected != null ? selected.name : 'None'), 500, 50);
};

var game = new Phaser.Game(1136, 640, Phaser.AUTO, 'game');
game.state.add('game', GameState, true);

window.game = game;