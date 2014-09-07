window.WIDTH = 1136;
window.HEIGHT = 640;

var GameState = function(game) {};

GameState.prototype.preload = function() {
    game.load.text('planetNames', 'res/planets.json');
    game.load.image('mainmenu','res/mainmenu.png');
    game.load.image('mainmenu','res/mainmenuDemo.png');
    game.load.image('noise.png', 'res/noise.png');
    game.load.spritesheet('pallete', 'res/pallete.png', 1, 1);
    game.load.spritesheet('planets', 'res/planet.png', 64, 64);
    game.load.spritesheet('overlays', 'res/planetOverlay.png', 64, 64);
    game.load.spritesheet('afterLevel', 'res/afterlevel.png', 300, 200);
};

var planets;
var portal;

var planetPool;

var PLANET_TYPES = 12;

GameState.prototype.create = function() {
    game.physics.startSystem(Phaser.Physics.ARCADE);
    //init background
    initBackground();
    //init planets
    planetPool = initPlanetPool();
    planets = game.add.group();
    selected = null;
    createPlanet(200, 200, {population : 200, range : 250});
    createPlanet(400, 300, {population : 100, range : 300});
    portal = createPortal(600, 100);
};

function initBackground() {
    game.stage.backgroundColor = 'black';
    var background = game.add.bitmapData(WIDTH, HEIGHT);
    var stars = [];
    for (var i = 0; i < WIDTH; i++) {
        stars.push({x : i,  y : game.rnd.integerInRange(0, HEIGHT), color : getRandomStarColor()});
    }
    stars.forEach(function(star) {
        background.ctx.fillStyle = star.color;
        background.ctx.fillRect(star.x, star.y, 1, 1);
    });

    var bgSprite = game.add.sprite(0, 0, background);
    bgSprite.inputEnabled = true;
    bgSprite.events.onInputDown.add(onSpaceClick);
}


function getRandomStarColor() {
    //its greyscale from #111111 to #AAAAAA
    var value = 1118481 * game.rnd.integerInRange(0, 10);
    return '#' + value.toString(16);
}

function initPlanetPool() {
    var names = JSON.parse(game.cache.getText('planetNames'))['planets'];
    names = Phaser.Utils.shuffle(names);
    var pool = [];
    for (var i = 0; i < names.length && i < PLANET_TYPES; i++) {
        pool.push({name : names.pop(), sprite : i});
    }
    return Phaser.Utils.shuffle(pool);
}

function createPlanet(x, y, config) {
    var planet = planets.create(x, y, 'planets');
    var info = planetPool.pop();
    planet.name = info.name;
    planet.animations.add('idle', [info.sprite], 10, true);
    planet.animations.play('idle');
    planet.inputEnabled = true;
    planet.events.onInputDown.add(onPlanetClick);
    planet.events.onInputOver.add(onPlanetHover);
    planet.events.onInputOut.add(onPlanetOut);
    planet.anchor.setTo(0.5);

    planet.overlay = createOverlay(x, y, false);
    planet.overlay.animations.add('dying', [0,1,2,3], 10, false);

    planet.rangeOverlay = createRangeOverlay(x, y, config.range);

    planet.population = config.population;
    planet.range = config.range;

    return planet;
}

function createPortal(x, y) {
    var portal = planets.create(x, y, 'planets');
    portal.name = 'Wormhole';
    portal.animations.add('idle', [16], 10, true);
    portal.animations.play('idle');
    portal.inputEnabled = true;
    portal.events.onInputDown.add(onPlanetClick);
    portal.events.onInputOver.add(onPlanetHover);
    portal.events.onInputOut.add(onPlanetOut);
    portal.anchor.setTo(0.5);

    portal.overlay = createOverlay(x, y, true);

    portal.population = 0;

    return portal;
}

function createOverlay(x, y, portal) {
    var overlay = game.add.sprite(x, y, 'overlays');
    overlay.animations.add('hover', [portal ? 6 : 4], 10, true);
    overlay.animations.add('selected', [portal ? 7 : 5], 10, true);
    overlay.visible = false;
    overlay.anchor.setTo(0.5);
    return overlay;
}

function createRangeOverlay(x, y, range) {
    var bmd = game.add.bitmapData(x + range + 2, y + range + 2);
    bmd.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    bmd.ctx.fillStyle = 'rgba(255,255,255,0.1)';
    bmd.ctx.beginPath();
    bmd.ctx.arc(x, y, range, 0, Math.PI*2, true);
    bmd.ctx.closePath();
    bmd.ctx.stroke();
    bmd.ctx.fill();
    var overlay = game.add.sprite(0, 0, bmd);
    overlay.visible = false;
    return overlay;
}

var selected = null;

function onSpaceClick(g, pointer) {
    deselect();
    //console.log(pointer.x + ":" + pointer.y);
}
function onPlanetClick(planet, pointer) {
    if (planet == portal) return;
    if (selected == null) {
        planet.overlay.visible = true;
        planet.rangeOverlay.visible = true;
        planet.overlay.animations.play('selected');
        selected = planet;
    } else if (selected != planet && this.game.physics.arcade.distanceBetween(selected, planet) <= selected.range) {
        var tunnel = createTunnel(selected, planet);
        console.log('tunnel ' + tunnel.from.name + " -> " + tunnel.to.name);
        deselect();
    } else {
        deselect();
        planet.overlay.visible = true;
        planet.rangeOverlay.visible = true;
        planet.overlay.animations.play('selected');
        selected = planet;
    }
}

function createTunnel(from, to) {
    var sortedFrom = {x : from.x < to.x ? from.x : to.x, y : from.y < to.y ? from.y : to.y};
    var sortedTo = {x : from.x > to.x ? from.x : to.x, y : from.y > to.y ? from.y : to.y};
    var distance = this.game.physics.arcade.distanceBetween(from, to);
    var bmd = game.add.bitmapData(distance, distance);
    bmd.ctx.strokeStyle = 'white';
    bmd.ctx.beginPath();
    bmd.ctx.moveTo(0, 0);
    bmd.ctx.lineTo(sortedTo.x - sortedFrom.x, sortedTo.y - sortedFrom.y);
    bmd.ctx.closePath();
    bmd.ctx.stroke();
    var tunnelSprite = game.add.sprite(sortedFrom.x, sortedFrom.y, bmd);
    tunnelSprite.inputEnabled = true;
    tunnelSprite.pixelPerfectClick = true;
    tunnelSprite.events.onInputDown.add(onTunnelClick);
    tunnelSprite.from = from;
    tunnelSprite.to = to;
    return tunnelSprite;
}

function onTunnelClick(tunnel, pointer) {
    tunnel.kill();
}

function deselect() {
    if (selected == null) return;
    selected.overlay.visible = false;
    selected.rangeOverlay.visible = false;
    selected = null;
}

function onPlanetHover(planet, pointer) {
    if (planet == selected) return;
    planet.overlay.visible = true;
    if (planet != portal) planet.rangeOverlay.visible = true;
    planet.overlay.animations.play('hover');
}

function onPlanetOut(planet, pointer) {
    if (planet == selected) return;
    planet.overlay.visible = false;
    if (planet != portal) planet.rangeOverlay.visible = false;
}

GameState.prototype.update = function() {
    portal.rotation += 0.01;
    portal.overlay.rotation += 0.01;
};

GameState.prototype.render = function() {
    game.debug.text('Selected: ' + toString(selected), 500, 50);
};

function toString(planet) {
    if (planet == null) return 'None';

    return planet.name + "(" + planet.population + ")";
}

var game = new Phaser.Game(WIDTH, HEIGHT, Phaser.AUTO, 'game');
game.state.add('game', GameState, true);

window.game = game;