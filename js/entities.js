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
    this.population = config.population != null ? config.population : 100;
    this.range = config.range != null ? config.range : 150;
    this.escapeRate = config.escapeRate != null ? config.escapeRate : 1;
    this.maxPopulation = config.maxPopulation != null ? config.maxPopulation : 9999;

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
Planet.prototype.update = function() {
    this.populationText.setText(this.population);
};
Planet.prototype.busySending = function() {
    var tunnel = getTunnelFrom(this);
    return tunnel != null && tunnel.active;
};
Planet.prototype.busyReceiving = function() {
    var tunnels = getTunnelsTo(this);
    for (var i = 0; i < tunnels.length; i++) {
        if (tunnels[i].active) return true;
    }
    return false;
};
Planet.prototype.decPopulation = function() {
    if (this.population == 0) return 0;

    if (this.population < this.escapeRate) {
        var result = this.population;
        this.population = 0;
        return result;
    }

    this.population -= this.escapeRate;

    return this.escapeRate;
};
Planet.prototype.incPopulation = function(delta) {
    var result = 0;
    this.population += delta;
    if (this.population > this.maxPopulation) {
        result = this.population - this.maxPopulation;
        this.population = this.maxPopulation;
    }
    return result;
};

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

    this.populationText = game.add.text(x + textOffset.x, y + textOffset.y, this.population, { font : '15px Arial', fill: '#ccc', align: 'center'});
}

Portal.prototype = Object.create(Planet.prototype);
Portal.prototype.constructor = Portal;
Portal.prototype.update = function() {
    this.planet.rotation += 0.01;
    this.overlay.rotation += 0.01;
    this.populationText.setText(this.population);
};

/******************************************
                   Tunnel
 ******************************************/

function Tunnel(from, to) {
    var sortedFrom = {x : from.x < to.x ? from.x : to.x, y : from.y < to.y ? from.y : to.y};
    var distance = game.physics.arcade.distanceBetween(from, to);
    var bmd = game.add.bitmapData(distance, distance);
    bmd.ctx.strokeStyle = 'white';
    bmd.ctx.beginPath();
    bmd.ctx.moveTo(from.x - sortedFrom.x, from.y - sortedFrom.y);
    bmd.ctx.lineTo(to.x - sortedFrom.x, to.y - sortedFrom.y);
    bmd.ctx.closePath();
    bmd.ctx.stroke();
    this.tunnel = game.add.sprite(sortedFrom.x, sortedFrom.y, bmd);
    this.tunnel.tunnel = this;
    this.from = from;
    this.to = to;

    this.tunnelRate = 2;
    this.counter = 0;
    this.active = false;
}
Tunnel.prototype.constructor = Tunnel;
Tunnel.prototype.kill = function() {
    this.tunnel.kill();
};
Tunnel.prototype.update = function() {
    //if (this.counter++ % this.tunnelRate) return;

    if (this.to.busySending() || this.from.busyReceiving()) {
        this.active = false;
        return;
    }

    var value = this.from.decPopulation();
    if (value > 0) {
        value = this.to.incPopulation(value);
        if (value > 0) {
            this.from.incPopulation(value);
            this.active = false;
        } else {
            this.active = true;
        }
    } else {
        this.active = false;
    }
};

/******************************************
              Helper functions
 ******************************************/

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