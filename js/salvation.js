window.WIDTH = 1136;
window.HEIGHT = 640;

window.SAVE_THRESH = 0.75;

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
var tunnels;

var PLANET_TYPES = 12;

var state = null;

window.state = state;

GameState.prototype.create = function() {
    game.physics.startSystem(Phaser.Physics.ARCADE);
    //init background
    initBackground();
    //init planets
    planets = [];
    tunnels = [];
    selected = null;
    createState();
    initPlanetPool();
    createPlanet(200, 200, {population : 200, range : 250});
    createPlanet(400, 300, {population : 100, range : 300});
    createPlanet(300, 400);
    createPortal(600, 100);
};

function createState() {
    window.state = state = {
        thresh : SAVE_THRESH,
        total : 0,
        lost : 0,
        saved : function() {
            return portal.population;
        },
        weLost : function() {
            return this.lost >= this.total * (1 - this.thresh);
        },
        weWon : function() {
            return this.total - 1 < this.saved() + this.lost && this.weAreWinning();
        },
        weAreWinning : function() {
            return this.saved() > this.total * this.thresh;
        },
        perfect : function() {
            return this.total - 1 < this.saved();
        }
    }
}

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

function createPlanet(x, y, config) {
    var planet = new Planet(x, y, config);
    planets.push(planet);
    state.total += planet.population;
}

function createPortal(x, y) {
    portal = new Portal(x, y);
}

var selected = null;

function onSpaceClick(g, pointer) {
    deselect();
    //console.log(pointer.x + ":" + pointer.y);
}

function tunnelExists(from, to) {
    for (var i = 0; i < tunnels.length; i++) {
        if (tunnels[i].from == from && tunnels[i].to == to) {
            return true;
        }
    }
    return false;
}

function getTunnelFrom(planet) {
    for (var i = 0; i < tunnels.length; i++) {
        if (tunnels[i].from == planet) return tunnels[i];
    }
    return null;
}

function getTunnelsTo(planet) {
    var tunnelsTo = [];
    tunnels.forEach(function(tunnel) {
        if (tunnel.to == planet) tunnelsTo.push(tunnel);
    });
    return tunnelsTo;
}

function onPlanetClick(planetSprite, pointer) {
    var planet = planetSprite.planet;
    if (selected == null) {
        if (planet == portal) return;
        planet.overlay.visible = true;
        planet.rangeOverlay.visible = true;
        planet.overlay.animations.play('selected');
        selected = planet;
    } else if (selected != planet && this.game.physics.arcade.distanceBetween(selected, planet) <= selected.range) {
        if (tunnelExists(selected, planet)) {
            deleteTunnel(selected, planet);
        } else if (tunnelExists(planet, selected)) {
            deleteTunnel(planet, selected);
            createTunnel(selected, planet);
        } else {
            createTunnel(selected, planet);
        }
        deselect();
    } else {
        deselect();
        if (planet == portal) return;
        planet.overlay.visible = true;
        planet.rangeOverlay.visible = true;
        planet.overlay.animations.play('selected');
        selected = planet;
    }
}

function deleteTunnel(from, to) {
    for (var i = tunnels.length - 1; i >= 0; i--) {
        var tunnel = tunnels[i];
        if (tunnel.from == from && tunnel.to == to) {
            tunnel.kill();
            tunnels.splice(i, 1);
        }
    }
}

function createTunnel(from, to) {
    tunnels.push(new Tunnel(from, to));
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

function onPlanetHover(planetSprite, pointer) {
    var planet = planetSprite.planet;
    if (planet == selected) return;
    planet.overlay.visible = true;
    if (planet != portal) planet.rangeOverlay.visible = true;
    planet.overlay.animations.play('hover');
}

function onPlanetOut(planetSprite, pointer) {
    var planet = planetSprite.planet;
    if (planet == selected) return;
    planet.overlay.visible = false;
    if (planet != portal) planet.rangeOverlay.visible = false;
}

GameState.prototype.update = function() {
    portal.update();

    tunnels.forEach(function(tunnel) {
        tunnel.update();
    });

    planets.forEach(function(planet) {
        planet.update();
    });
};

GameState.prototype.render = function() {
    game.debug.text('Selected: ' + toString(selected), 950, 30);
    game.debug.text('Planets: ' + planets.length, 950, 50);
    game.debug.text('Tunnels: ' + tunnels.length, 950, 70);
    game.debug.text('Status: ' + state.saved() + '/' + state.lost + '/' + state.total, 950, 90);
    if (state.weWon()) {
        if (state.perfect()) {
            game.debug.text('PERFECT', 950, 110);
        } else {
            game.debug.text('VICTORY', 950, 110);
        }
    } else if (state.weLost()) {
        game.debug.text('DEFEAT', 950, 110);
    } else if (state.weAreWinning()) {
        game.debug.text('RELAX', 950, 110);
    }
};

function toString(planet) {
    if (planet == null) return 'None';

    return planet.name + "(" + planet.population + ")";
}

var game = new Phaser.Game(WIDTH, HEIGHT, Phaser.AUTO, 'game');
game.state.add('game', GameState, true);

window.game = game;