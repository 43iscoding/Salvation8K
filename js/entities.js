var textOffset = {x : -12, y: - 50};

var planetPool;

window.initPlanetPool = function() {
        var names = JSON.parse(game.cache.getText('planetNames'))['planets'];
        names = Phaser.Utils.shuffle(names);
        var pool = [];
        for (var i = 0; i < names.length && i < PLANET_TYPES; i++) {
            pool.push({name : names.pop(), sprite : i});
        }
        planetPool =  Phaser.Utils.shuffle(pool);
};

/******************************************
                    Planet
 ******************************************/

function Planet(x, y, config) {
    this.x = x;
    this.y = y;

    if (config == undefined || config == null) config = {};
    this.population = config.population | 100;
    this.range = config.range | 150;

    var info = planetPool.pop();
    this.name = info.name;

    this.planet = game.add.sprite(x, y, 'planets');
    this.planet.planet = this;
    this.planet.animations.add('idle', [info.sprite], 10, true);
    this.planet.animations.play('idle');
    this.planet.inputEnabled = true;
    this.planet.events.onInputDown.add(onPlanetClick);
    this.planet.events.onInputOver.add(onPlanetHover);
    this.planet.events.onInputOut.add(onPlanetOut);
    this.planet.anchor.setTo(0.5);

    this.overlay = createOverlay(x, y, false);
    this.overlay.animations.add('dying', [0,1,2,3], 10, false);

    this.rangeOverlay = createRangeOverlay(x, y, config.range | 150);

    this.populationText = game.add.text(x + textOffset.x, y + textOffset.y, this.population, { font : '15px Arial', fill: '#ccc', align: 'center'});
}

Planet.prototype.constructor = Planet;

/******************************************
                    Portal
 ******************************************/

function Portal(x, y) {
    this.x = x;
    this.y = y;
    this.planet = game.add.sprite(x, y, 'planets');
    this.planet.planet = this;
    this.name = 'Wormhole';
    this.planet.animations.add('idle', [16], 10, true);
    this.planet.animations.play('idle');
    this.planet.inputEnabled = true;
    this.planet.events.onInputDown.add(onPlanetClick);
    this.planet.events.onInputOver.add(onPlanetHover);
    this.planet.events.onInputOut.add(onPlanetOut);
    this.planet.anchor.setTo(0.5);

    this.overlay = createOverlay(x, y, true);

    this.population = 0;
}

Portal.prototype.constructor = Portal;
Portal.prototype.update = function() {
    this.planet.rotation += 0.01;
    this.overlay.rotation += 0.01;
};










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