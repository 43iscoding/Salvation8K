(function() {

var objects = [];
var particles = [];

var selected = null;

var counter = 0;

var VOID = null;

var populationLost = 0;
var totalPopulation = 0;

var uiEntities = [];

var portal;

var planetPool = [];
var PLANET_TYPES = 12;

var saveThreshold = 0.75;

var state = GAME_STATE.MAIN_MENU;

var twitter = null;

window.getState = function() {
    return state;
};

window.getPopulationInfo = function() {
    return {
        total : Math.round(totalPopulation),
        lost : Math.round(populationLost),
        saved : Math.round(portal == null ? 0 : portal.getPopulation()),
        thresh : saveThreshold,
        weLost : function() {
            return this.lost >= this.total * (1 - this.thresh);
        },
        weWon : function() {
            return this.total - 1 < this.saved + this.lost && this.saved >= this.total * this.thresh;
        },
        perfect : function() {
            return this.total - 1 < this.saved;
        }
    };
};

window.getVoid = function() {
    return VOID;
};

window.getObjects = function() {
    return objects;
};
window.getSelected = function() {
    return selected;
};

window.init = init;

function init() {
    initUI();
    input.onClicked(onClicked);
    tick();
}

function initUI() {
    uiEntities = [];
    uiEntities.push(spawn(TYPE.LEVEL_BUTTON, 164, 47, 'level1'));
    uiEntities.push(spawn(TYPE.LEVEL_BUTTON, 210, 47, 'level2'));
    uiEntities.push(spawn(TYPE.LEVEL_BUTTON, 256, 47, 'level3'));
    uiEntities.push(spawn(TYPE.LEVEL_BUTTON, 302, 47, 'level4'));
    uiEntities.push(spawn(TYPE.LEVEL_BUTTON, 348, 47, 'level5'));
    uiEntities.push(spawn(TYPE.LEVEL_BUTTON, 394, 47, 'level6'));
    uiEntities.push(spawn(TYPE.LEVEL_BUTTON, 440, 47, 'level7'));

    if (!DEMO) {
        uiEntities.push(spawn(TYPE.LEVEL_BUTTON, 164, 94, 'level8'));
        uiEntities.push(spawn(TYPE.LEVEL_BUTTON, 210, 94, 'level9'));
        uiEntities.push(spawn(TYPE.LEVEL_BUTTON, 256, 94, 'level10'));
        uiEntities.push(spawn(TYPE.LEVEL_BUTTON, 302, 94, 'level11'));
        uiEntities.push(spawn(TYPE.LEVEL_BUTTON, 348, 94, 'level12'));
        uiEntities.push(spawn(TYPE.LEVEL_BUTTON, 394, 94, 'level13'));
        uiEntities.push(spawn(TYPE.LEVEL_BUTTON, 440, 94, 'level14'));
    }

    uiEntities.push(spawn(TYPE.BUTTON, 279, 123, 'lostMenu'));
    uiEntities.push(spawn(TYPE.BUTTON, 324, 123, 'lostRestart'));
    uiEntities.push(spawn(TYPE.BUTTON, 259, 124, 'winMenu'));
    uiEntities.push(spawn(TYPE.BUTTON, 301, 124, 'winRestart'));
    uiEntities.push(spawn(TYPE.BUTTON, 342, 124, 'winNext'));

    twitter = spawn(TYPE.LINK, 315, 186, 'http://www.twitter.com/43ishere');
}

function startLevel() {
    if (epilogue() || state == GAME_STATE.THE_END) {
        state = GAME_STATE.THE_END;
        return;
    }
    state = GAME_STATE.LEVEL;
    initStars();
    resetPlanetPool();
    objects = [];
    particles = [];
    populationLost = 0;
    totalPopulation = 0;
    selected = null;
    buildLevel(getCurrentLevelConfig());
}

function buildLevel(config) {
    VOID = generateVoid(config.voidSpeed);
    config.planets.forEach(function (planet) {
        var population = planet.population == undefined ? DEFAULT_POPULATION : planet.population;
        var maxPopulation = planet.maxPopulation == undefined ? DEFAULT_MAX_POPULATION : planet.maxPopulation;
        if (maxPopulation < population) {
            population = maxPopulation;
        }
        var escapeRate = planet.escapeRate == undefined ? DEFAULT_ESCAPE_RATE : planet.escapeRate;
        var range = planet.range == undefined ? DEFAULT_RANGE : planet.range;
        objects.push(generatePlanet(planet.x, planet.y, population, maxPopulation, escapeRate, range));
    });

    objects.push(portal = spawn(TYPE.PORTAL, config.portal.x, config.portal.y));
}

function generateVoid(speed) {
    return {
        speed : speed,
        to : 0,
        offset: randomInt(300),
        update : function(delta) {
            this.to += delta * speed;
            this.offset = randomInt(300);
        }};
}

window.getTunnelFrom = function(planet) {
    for (var i = 0; i < objects.length; i++) {
        if (objects[i].type != TYPE.TUNNEL) continue;

        if (objects[i].from == planet) return objects[i];
    }
    return null;
};

window.getTunnelsTo = function(planet) {
    var tunnels = [];
    for (var i = 0; i < objects.length; i++) {
        if (objects[i].type != TYPE.TUNNEL) continue;

        if (objects[i].to == planet) tunnels.push(objects[i]);
    }
    return tunnels;
};

function generatePlanet(x, y, population, maxPopulation, escapeRate, range) {
    var style = planetPool.pop();
    totalPopulation += population;
    return spawn(TYPE.PLANET, x, y, { style : style, population : population, maxPopulation : maxPopulation,
                                      escapeRate : escapeRate, range : range});
}

function resetPlanetPool() {
    planetPool = [];
    for (var i = 0; i < PLANET_TYPES; i++) {
        planetPool.push(i);
    }
    shuffle(planetPool);
}

function shuffle(o){
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
}

function tick() {
    counter++;
    if (DEBUG) debug.calculateUPS();
    var from = currentTime();
    processInput();
    update();
    render(objects, particles);
    setTimeout(tick, 1000 / fps - (currentTime() - from));
}

function onClicked(x, y) {
    objects.forEach(function(object) {
        object.setSelected(false);
    });

    if (state == GAME_STATE.LEVEL) {
        for (var i = 0; i < objects.length; i++) {
            if (objects[i].type != TYPE.PLANET && objects[i].type != TYPE.PORTAL) continue;
            var planet = objects[i];
            if (planet.dead()) {
                if (planet == selected) {
                    selected = null;
                    return;
                }
                continue;
            }

            if (engine.containsPoint(planet, x, y)) {
                if (selected == null) {
                    if (planet.type == TYPE.PLANET) {
                        sound.play('select');
                        selected = planet;
                        planet.setSelected(true);
                    }
                } else if (selected == planet) {
                    selected = null;
                    sound.play('deselect')
                } else {
                    //make tunnel
                    if (engine.distance(selected.getCenter(), planet.getCenter()) < selected.getRange()) {
                        addOrRemoveTunnel(selected, planet);
                    }
                    selected = null;
                }
                return;
            }
        }
        if (selected != null) {
            sound.play('deselect');
            selected = null;
        }
    } else if (state == GAME_STATE.AFTER_LEVEL) {
        var info = getPopulationInfo();

        for (var j = 0; j < uiEntities.length; j++) {
            if (!engine.containsPoint(uiEntities[j], x, y)) continue;

            if (!uiEntities[j].win && info.weWon()) continue;
            if (!uiEntities[j].lost && info.weLost()) continue;

            if (uiEntities[j].id.indexOf('Restart') > 0) {
                startLevel();
            } else if (uiEntities[j].id.indexOf('Next') > 0) {
                nextLevel();
                startLevel();
            } else if (uiEntities[j].id.indexOf('Menu') > 0) {
                state = GAME_STATE.MAIN_MENU;
            } else {
                console.log('Unknown button: ' + uiEntities[j].id);
            }
        }
    } else if (state == GAME_STATE.MAIN_MENU) {
        for (var k = 0; k < uiEntities.length; k++) {
            if (!engine.containsPoint(uiEntities[k], x, y)) continue;
            if (uiEntities[k].type != TYPE.LEVEL_BUTTON) continue;

            var level = uiEntities[k].level - 1;

            if (unlocked(level)) {
                setLevel(level);
                startLevel();
            }
        }
    } else if (state == GAME_STATE.THE_END) {
        if (engine.containsPoint(twitter, input.getMouse().x, input.getMouse().y)) {
            window.location = twitter.link;
        }
    }
}

function addOrRemoveTunnel(from, to) {
    for (var i = objects.length - 1; i >= 0; i--) {
        if (objects[i].type != TYPE.TUNNEL) continue;
        var tunnel = objects[i];
        if (tunnel.from == from) {
            objects.splice(i, 1);
            if (tunnel.to == to) {
                sound.play('tunnelDestroy');
                return;
            }
        } else if (tunnel.from == to && tunnel.to == from) {
            objects.splice(i, 1);
        }
    }
    objects.push(spawn(TYPE.TUNNEL, 0, 0, {from: from, to : to}));
    sound.play('tunnelCreate');
}

function processInput() {

    //toggle mute
    if (input.isPressed(input.keys.M.key)) {
        input.clearInput(input.keys.M.key);
        sound.toggleMute();
    }

    //restart
    if (input.isPressed(input.keys.R.key)) {
        if (state == GAME_STATE.LEVEL || state == GAME_STATE.AFTER_LEVEL) {
            input.clearInput(input.keys.R.key);
            startLevel();
        }
    }
    //proceed
    if (input.isPressed(input.keys.SPACE.key || input.isPressed(input.keys.ENTER.key))) {
        if (state == GAME_STATE.AFTER_LEVEL && getPopulationInfo().weWon()) {
            nextLevel();
            if (epilogue()) {
                state = GAME_STATE.THE_END;
            } else {
                startLevel();
            }
        }
    }

    //go to menu
    if (input.isPressed(input.keys.ESCAPE.key)) {
        state = GAME_STATE.MAIN_MENU;
    }

    if (DEBUG) {
        if (input.isPressed(input.keys.RIGHT_BRACKET.key)) {
            input.clearInput(input.keys.RIGHT_BRACKET.key);
            state = GAME_STATE.LEVEL;
            nextLevel();
            startLevel();
        }

        if (input.isPressed(input.keys.LEFT_BRACKET.key)) {
            input.clearInput(input.keys.LEFT_BRACKET.key);
            state = GAME_STATE.LEVEL;
            previousLevel();
            startLevel();
        }
    }
}

function update() {
    if (state == GAME_STATE.MAIN_MENU) return;
    if (state == GAME_STATE.THE_END) {
        twitterMouseover(engine.containsPoint(twitter, input.getMouse().x, input.getMouse().y));
    }

    for (var i = objects.length - 1; i >= 0; i--) {
        if (updateEntity(objects[i])) objects.splice(i, 1);
    }

    //process particles
    for (var j = particles.length - 1; j >= 0; j--) {
        if (updateParticle(particles[j])) {
            particles.splice(j, 1);
        }
    }
    var info = getPopulationInfo();

    if (info.weLost()) {
        VOID.update(2);
    } else if (!info.weWon() && counter % VOID_RATE == 0) {
        VOID.update(1);
    }

    if (state == GAME_STATE.LEVEL) {
        if (info.weLost() || info.weWon()) {
            selected = null;
            state = GAME_STATE.AFTER_LEVEL;

            if (info.weWon()) {
                sound.play('victory');
                unlockLevel(getCurrentLevel() + 1);
                if (info.perfect()) {
                    setPerfect(getCurrentLevel());
                }
            } else if (info.weLost()) {
                sound.play('defeat');
            }
        }

        //sound
        if (currentTime() > lastTunnelSound + 1000 && activeTunnel()) {
            lastTunnelSound = currentTime();
            sound.play('tunnelChannel');
        }
    }
}

function activeTunnel() {
    for (var i = 0; i < objects.length; i++) {
        if (objects[i].type != TYPE.TUNNEL) return;
        if (objects[i].isActive()) return true;
    }
    return false;
}

var lastTunnelSound = 0;

function updateEntity(entity) {
    entity.update();
    if (entity.type == TYPE.PLANET) {
        if (entity.died()) {
            sound.play('planetDestroy');
            var center = entity.getCenter();
            if (entity.getPopulation() > 0) {
                addParticle(TYPE.PARTICLE.DIED, center.x, center.y, {value : entity.getPopulation()});
            }
            //sound.play('explosion', false);
            populationLost += entity.getPopulation();
            entity.resetPopulation();
            if (selected == entity) {
                entity.selected = false;
                selected = null;
            }
        } else if (entity.getPopulation() == 0) {
            if (selected == entity) {
                entity.selected = false;
                selected = null;
            }

        }
    } else if (entity.type == TYPE.TUNNEL) {
        return (entity.to.dead() || entity.from.dead());
    }
    return false;
}

function updateParticle(particle) {
    if (particle.updateSprite()) {
        return true;
    }

    if (engine.offScreen(particle)) return true;

    return particle.update();
}

function addParticle(type, x, y, args) {
    particles.push(spawn(type, x, y, args));
}

}());