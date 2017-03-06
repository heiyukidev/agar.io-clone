/*jslint bitwise: true, node: true */
'use strict';

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var SAT = require('sat');

// Import game settings.
var c = require('../../config.json');

// Import utilities.
var util = require('./lib/util');

var users = [];
var massFood = [];
var food = [];
var virus = [];
var sockets = {};

var leaderboard = [];
var leaderboardChanged = false;

var V = SAT.Vector;
var C = SAT.Circle;

app.use(express.static(__dirname + '/../client'));
//////////////////////////////////////////////////////////////
////////////Heiyuki Code
//////////////////////////////////////////////////////////////
/////////////////////////Modules Load
const passport = require('passport');
const mongoose = require('mongoose');
const configDB = require('./config/database.js');
const User = require('./models/user');
var twig = require('twig');
const bodyparser = require('body-parser');
const lusca = require('lusca');

////////////////////////////////SECURITY
var host = "http://localhost:3000/";

app.use((req, res, next) => {
    res.header("x-powered-by", "Belief");
    next();
});


var cspParams = {
    policy: {
        "default-src": "'self' " + host,
        "script-src": "'self' https://*.googleapis.com/ http://*.google-analytics.com/ " + host,
        "style-src": "'self' https://*.googleapis.com/ 'unsafe-inline'",
        "img-src": "'self' https://*.googleapis.com/ http://*.google-analytics.com/ https://*.gstatic.com/ http://i.imgur.com/M5VeRDH.png http://i.imgur.com/3m8RjR4.png data: " + host,
        "font-src": "'self' https://*.gstatic.com/ " + host,
        "connect-src": "'self' https://*.googleapis.com/ " + host,
        "frame-src": "'self' " + host
    }
};
app.use(lusca.csp(cspParams));
app.use(lusca.hsts({
    maxAge: 31536000
}));
app.use(lusca.xframe('SAMEORIGIN'));
app.use(lusca.p3p('ABCDEF'));
app.use(lusca.xssProtection(true));
app.use(lusca.nosniff());
////////////////////////////CONFIG
require('./config/passport')(passport);
app.use(passport.initialize());
app.use(bodyparser());
//////////////////////////Routing
app.get('/auth', passport.authenticate('facebook', {
    scope: 'email'
}));

function getUserFromToken(token) {
    return new Promise(function(resolve, reject) {
        mongoose.connect(configDB.url);
        User.findOne({
            'facebook.token': token
        }, function(err, user) {

            if (err) {
                mongoose.disconnect();
                reject(err);
            }
            if (!user) {
                mongoose.disconnect();
                console.log("[DEBUG] User not found");
                resolve();
            } else {
                mongoose.disconnect();
                resolve(user);
            }
        });
    });
}

function saveUser(paramuser) {
    return new Promise(function(resolve, reject) {
        getUserFromToken(paramuser.facebook.token).then((baseUser) => {
            mongoose.connect(configDB.url);
            // var user = new User();
            // user._id = baseUser._id;
            User.findOneAndUpdate({
                "facebook.token": paramuser.facebook.token
            }, {
                $set: {
                    cin: paramuser.cin,
                    facebook: {
                        id: baseUser.facebook.id,
                        token: paramuser.token
                    },
                    firstName: paramuser.firstName,
                    lastName: paramuser.lastName,
                    email: paramuser.email,
                    picture: paramuser.picture,
                    phone: paramuser.phone,
                    score: paramuser.score

                }
            }, (err, u) => {
                if (err) {
                    mongoose.disconnect();
                    reject(err);
                }
                mongoose.disconnect();
                resolve(u);
            });
        }, (err) => {
            mongoose.disconnect();
            reject(err);
        });
    });
}
var avatars = ["https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/SNice.svg/1200px-SNice.svg.png"];
app.get('/logged', (req, res) => {
    if (req.headers.authorization) {
        getUserFromToken(req.headers.authorization).then((user) => {
            res.send(user);
        }, (err) => {
            console.log("[ERROR] Error In /logged");
            console.log(err);
            res.status(500);
        });
    } else {
        res.status(401).send();
    }
});
app.get('/auth/callback',
    passport.authenticate('facebook', {}), (req, res) => {
        res.redirect('/registration/' + req.user.facebook.token);

    });
app.get('/registration/:token', (req, res) => {
    if (req.params.token) {
        getUserFromToken(req.params.token).then((user) => {
            if (user.cin == "replace") {
                twig.renderFile(__dirname + '/../client/authentification/index.html.twig', {
                    user: user
                }, (err, html) => {
                    if (err) {
                        console.log(err);
                        res.status(500);
                    }
                    res.send(html);
                });
            } else {
                res.redirect('/#' + user.facebook.token);
            }
        }, (err) => {
            if (req.params.token.length > 20) {
                console.log("[ERROR] Error In /registration/:token for token " + req.params.token);
                console.log(err);
            }
            res.redirect('/');
        });
    } else {
        res.redirect('/');
    }
});
app.post('/auth/check', (req, res) => {
    if (req.body.token) {
        getUserFromToken(req.body.token).then((user) => {
            user.picture = req.body.picture;
            user.firstName = req.body.firstName;
            user.lastName = req.body.lastName;
            user.facebook.token = req.body.token;
            user.cin = req.body.cin;
            user.email = req.body.email;
            user.phone = req.body.phone;
            saveUser(user).then((newUser) => {
                res.redirect('/#' + newUser.facebook.token);
            }, (err) => {
                console.log("[ERROR] Error In /auth/check");
                console.log(err);
                res.redirect('/');
            });

        }, (err) => {
            console.log("[ERROR] Error In /auth/check");
            console.log(err);
            res.redirect('/');
        });
    } else {
        console.log("[ERROR] Error In /auth/check Requires Token");
        res.status(401).send();
    }
});
app.get('/', (req, res) => {
    res.render('index');
});


app.get('/getScore', (req, res) => {
    mongoose.connect(configDB.url);
    User.find({}).limit(10).
    sort('-score').select({
        firstName: 1,
        lastName: 1,
        email: 1,
        score: 1,
        picture: 1
    }).exec((err, docs) => {
        mongoose.disconnect();

        res.send(docs);
    });
});



//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////
// var monitor = require("os-monitor");
// var usage = require('usage');
//
//
//
// // basic usage
// monitor.start({
//     delay: 1000
// });
// var pid = process.pid;
// var usageOptions = {
//     keepHistory: true
// };
// var cycleCounter = 0;
// // define handler that will always fire every cycle
// monitor.on('monitor', function(event) {
//     cycleCounter++;
//     usage.lookup(pid, usageOptions, function(err, result) {
//         console.log(result);
//     });
// });
//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////
var initMassLog = util.log(c.defaultPlayerMass, c.slowBase);

function addFood(toAdd) {
    var radius = util.massToRadius(c.foodMass);
    while (toAdd--) {
        var position = c.foodUniformDisposition ? util.uniformPosition(food, radius) : util.randomPosition(radius);
        food.push({
            // Make IDs unique.
            id: ((new Date()).getTime() + '' + food.length) >>> 0,
            x: position.x,
            y: position.y,
            radius: radius,
            mass: Math.random() + 2,
            hue: Math.round(Math.random() * 360)
        });
    }
}

function addVirus(toAdd) {
    while (toAdd--) {
        var mass = util.randomInRange(c.virus.defaultMass.from, c.virus.defaultMass.to, true);
        var radius = util.massToRadius(mass);
        var position = c.virusUniformDisposition ? util.uniformPosition(virus, radius) : util.randomPosition(radius);
        virus.push({
            id: ((new Date()).getTime() + '' + virus.length) >>> 0,
            x: position.x,
            y: position.y,
            radius: radius,
            mass: mass,
            fill: c.virus.fill,
            stroke: c.virus.stroke,
            strokeWidth: c.virus.strokeWidth
        });
    }
}

function removeFood(toRem) {
    while (toRem--) {
        food.pop();
    }
}

function movePlayer(player) {
    var x = 0,
        y = 0;
    for (var i = 0; i < player.cells.length; i++) {
        var target = {
            x: player.x - player.cells[i].x + player.target.x,
            y: player.y - player.cells[i].y + player.target.y
        };
        var dist = Math.sqrt(Math.pow(target.y, 2) + Math.pow(target.x, 2));
        var deg = Math.atan2(target.y, target.x);
        var slowDown = 1;
        if (player.cells[i].speed <= 6.25) {
            slowDown = util.log(player.cells[i].mass, c.slowBase) - initMassLog + 1;
        }

        var deltaY = player.cells[i].speed * Math.sin(deg) / slowDown;
        var deltaX = player.cells[i].speed * Math.cos(deg) / slowDown;

        if (player.cells[i].speed > 6.25) {
            player.cells[i].speed -= 0.5;
        }
        if (dist < (50 + player.cells[i].radius)) {
            deltaY *= dist / (50 + player.cells[i].radius);
            deltaX *= dist / (50 + player.cells[i].radius);
        }
        if (!isNaN(deltaY)) {
            player.cells[i].y += deltaY;
        }
        if (!isNaN(deltaX)) {
            player.cells[i].x += deltaX;
        }
        // Find best solution.
        for (var j = 0; j < player.cells.length; j++) {
            if (j != i && player.cells[i] !== undefined) {
                var distance = Math.sqrt(Math.pow(player.cells[j].y - player.cells[i].y, 2) + Math.pow(player.cells[j].x - player.cells[i].x, 2));
                var radiusTotal = (player.cells[i].radius + player.cells[j].radius);
                if (distance < radiusTotal) {
                    if (player.lastSplit > new Date().getTime() - 1000 * c.mergeTimer) {
                        if (player.cells[i].x < player.cells[j].x) {
                            player.cells[i].x--;
                        } else if (player.cells[i].x > player.cells[j].x) {
                            player.cells[i].x++;
                        }
                        if (player.cells[i].y < player.cells[j].y) {
                            player.cells[i].y--;
                        } else if ((player.cells[i].y > player.cells[j].y)) {
                            player.cells[i].y++;
                        }
                    } else if (distance < radiusTotal / 1.75) {
                        player.cells[i].mass += player.cells[j].mass;
                        player.cells[i].radius = util.massToRadius(player.cells[i].mass);
                        player.cells.splice(j, 1);
                    }
                }
            }
        }
        if (player.cells.length > i) {
            var borderCalc = player.cells[i].radius / 3;
            if (player.cells[i].x > c.gameWidth - borderCalc) {
                player.cells[i].x = c.gameWidth - borderCalc;
            }
            if (player.cells[i].y > c.gameHeight - borderCalc) {
                player.cells[i].y = c.gameHeight - borderCalc;
            }
            if (player.cells[i].x < borderCalc) {
                player.cells[i].x = borderCalc;
            }
            if (player.cells[i].y < borderCalc) {
                player.cells[i].y = borderCalc;
            }
            x += player.cells[i].x;
            y += player.cells[i].y;
        }
    }
    player.x = x / player.cells.length;
    player.y = y / player.cells.length;
}

function moveMass(mass) {
    var deg = Math.atan2(mass.target.y, mass.target.x);
    var deltaY = mass.speed * Math.sin(deg);
    var deltaX = mass.speed * Math.cos(deg);

    mass.speed -= 0.5;
    if (mass.speed < 0) {
        mass.speed = 0;
    }
    if (!isNaN(deltaY)) {
        mass.y += deltaY;
    }
    if (!isNaN(deltaX)) {
        mass.x += deltaX;
    }

    var borderCalc = mass.radius + 5;

    if (mass.x > c.gameWidth - borderCalc) {
        mass.x = c.gameWidth - borderCalc;
    }
    if (mass.y > c.gameHeight - borderCalc) {
        mass.y = c.gameHeight - borderCalc;
    }
    if (mass.x < borderCalc) {
        mass.x = borderCalc;
    }
    if (mass.y < borderCalc) {
        mass.y = borderCalc;
    }
}

function balanceMass() {
    var totalMass = food.length * c.foodMass +
        users
        .map(function(u) {
            return u.massTotal;
        })
        .reduce(function(pu, cu) {
            return pu + cu;
        }, 0);

    var massDiff = c.gameMass - totalMass;
    var maxFoodDiff = c.maxFood - food.length;
    var foodDiff = parseInt(massDiff / c.foodMass) - maxFoodDiff;
    var foodToAdd = Math.min(foodDiff, maxFoodDiff);
    var foodToRemove = -Math.max(foodDiff, maxFoodDiff);

    if (foodToAdd > 0) {
        //console.log('[DEBUG] Adding ' + foodToAdd + ' food to level!');
        addFood(foodToAdd);
        //console.log('[DEBUG] Mass rebalanced!');
    } else if (foodToRemove > 0) {
        //console.log('[DEBUG] Removing ' + foodToRemove + ' food from level!');
        removeFood(foodToRemove);
        //console.log('[DEBUG] Mass rebalanced!');
    }

    var virusToAdd = c.maxVirus - virus.length;

    if (virusToAdd > 0) {
        addVirus(virusToAdd);
    }
}

io.on('connection', function(socket) {
    console.log('A user connected!', socket.handshake.query.type);

    var type = socket.handshake.query.type;
    var radius = util.massToRadius(c.defaultPlayerMass);
    var position = c.newPlayerInitialPosition == 'farthest' ? util.uniformPosition(users, radius) : util.randomPosition(radius);

    var cells = [];
    var massTotal = 0;
    if (type === 'player') {
        cells = [{
            mass: c.defaultPlayerMass,
            x: position.x,
            y: position.y,
            radius: radius
        }];
        massTotal = c.defaultPlayerMass;
    }

    var currentPlayer = {
        id: socket.id,
        x: position.x,
        y: position.y,
        w: c.defaultPlayerMass,
        h: c.defaultPlayerMass,
        cells: cells,
        massTotal: massTotal,
        hue: Math.round(Math.random() * 360),
        type: type,
        lastHeartbeat: new Date().getTime(),
        target: {
            x: 0,
            y: 0
        }
    };

    socket.on('gotit', function(player) {
        console.log('[INFO] Player ' + player.name + ' connecting!');
        // setTimeout(() => {
        //
        //     sockets[player.id].emit('RIP',{firstName:"heiyuki"});
        // }, 1000);
        if (util.findIndex(users, player.id) > -1) {
            console.log('[INFO] Player ID is already connected, kicking.');
            socket.disconnect();
        } else {
            console.log('[INFO] Player ' + player.name + ' connected!');
            sockets[player.id] = socket;

            var radius = util.massToRadius(c.defaultPlayerMass);
            var position = c.newPlayerInitialPosition == 'farthest' ? util.uniformPosition(users, radius) : util.randomPosition(radius);

            player.x = position.x;
            player.y = position.y;
            player.target.x = 0;
            player.target.y = 0;
            if (type === 'player') {
                player.cells = [{
                    mass: c.defaultPlayerMass,
                    x: position.x,
                    y: position.y,
                    radius: radius
                }];
                player.massTotal = c.defaultPlayerMass;
            } else {
                player.cells = [];
                player.massTotal = 0;
            }
            player.hue = Math.round(Math.random() * 360);
            currentPlayer = player;
            currentPlayer.lastHeartbeat = new Date().getTime();
            users.push(currentPlayer);

            io.emit('playerJoin', {
                name: currentPlayer.name
            });

            socket.emit('gameSetup', {
                gameWidth: c.gameWidth,
                gameHeight: c.gameHeight
            });
            console.log('Total players: ' + users.length);
        }

    });

    socket.on('pingcheck', function() {
        socket.emit('pongcheck');
    });

    socket.on('massMax', function(data) {
        if (data.token) {
            getUserFromToken(data.token).then((user) => {
                if (user) {
                    if (user.score < data.value) {
                        user.score = data.value;
                        saveUser(user).then((user) => {}, (err) => {
                            console.log("[ERROR] Error In massMax Event");
                            console.log(err);
                        });
                    }
                }
            }, (err) => {
                console.log("[ERROR] Error In massMax Event");
                console.log(err);
            });
        }
    });
    socket.on('windowResized', function(data) {
        currentPlayer.screenWidth = data.screenWidth;
        currentPlayer.screenHeight = data.screenHeight;
    });

    socket.on('respawn', function() {
        if (util.findIndex(users, currentPlayer.id) > -1)
            users.splice(util.findIndex(users, currentPlayer.id), 1);
        socket.emit('welcome', currentPlayer);
        console.log('[INFO] User ' + currentPlayer.name + ' respawned!');
    });

    socket.on('disconnect', function() {
        if (util.findIndex(users, currentPlayer.id) > -1)
            users.splice(util.findIndex(users, currentPlayer.id), 1);
        console.log('[INFO] User ' + currentPlayer.name + ' disconnected!');

        socket.broadcast.emit('playerDisconnect', {
            name: currentPlayer.name
        });
    });

    socket.on('pass', function(data) {
        if (data[0] === c.adminPass) {
            console.log('[ADMIN] ' + currentPlayer.name + ' just logged in as an admin!');
            currentPlayer.admin = true;
        } else {
            console.log('[ADMIN] ' + currentPlayer.name + ' attempted to log in with incorrect password.');
        }
    });

    socket.on('kick', function(data) {
        if (currentPlayer.admin) {
            var reason = '';
            var worked = false;
            for (var e = 0; e < users.length; e++) {
                if (users[e].name === data[0] && !users[e].admin && !worked) {
                    if (data.length > 1) {
                        for (var f = 1; f < data.length; f++) {
                            if (f === data.length) {
                                reason = reason + data[f];
                            } else {
                                reason = reason + data[f] + ' ';
                            }
                        }
                    }
                    if (reason !== '') {
                        console.log('[ADMIN] User ' + users[e].name + ' kicked successfully by ' + currentPlayer.name + ' for reason ' + reason);
                    } else {
                        console.log('[ADMIN] User ' + users[e].name + ' kicked successfully by ' + currentPlayer.name);
                    }
                    sockets[users[e].id].emit('kick', reason);
                    sockets[users[e].id].disconnect();
                    users.splice(e, 1);
                    worked = true;
                }
            }
        } else {
            console.log('[ADMIN] ' + currentPlayer.name + ' is trying to use -kick but isn\'t an admin.');
        }
    });

    // Heartbeat function, update everytime.
    socket.on('0', function(target) {
        currentPlayer.lastHeartbeat = new Date().getTime();
        if (target.x !== currentPlayer.x || target.y !== currentPlayer.y) {
            currentPlayer.target = target;
        }
    });

    socket.on('1', function() {
        // Fire food.
        for (var i = 0; i < currentPlayer.cells.length; i++) {
            if (((currentPlayer.cells[i].mass >= c.defaultPlayerMass + c.fireFood) && c.fireFood > 0) || (currentPlayer.cells[i].mass >= 20 && c.fireFood === 0)) {
                var masa = 1;
                if (c.fireFood > 0)
                    masa = c.fireFood;
                else
                    masa = currentPlayer.cells[i].mass * 0.1;
                currentPlayer.cells[i].mass -= masa;
                currentPlayer.massTotal -= masa;
                massFood.push({
                    id: currentPlayer.id,
                    num: i,
                    masa: masa,
                    hue: currentPlayer.hue,
                    target: {
                        x: currentPlayer.x - currentPlayer.cells[i].x + currentPlayer.target.x,
                        y: currentPlayer.y - currentPlayer.cells[i].y + currentPlayer.target.y
                    },
                    x: currentPlayer.cells[i].x,
                    y: currentPlayer.cells[i].y,
                    radius: util.massToRadius(masa),
                    speed: 25
                });
            }
        }
    });
    socket.on('2', function(virusCell) {
        function splitCell(cell) {
            if (cell.mass >= c.defaultPlayerMass * 2) {
                cell.mass = cell.mass / 2;
                cell.radius = util.massToRadius(cell.mass);
                currentPlayer.cells.push({
                    mass: cell.mass,
                    x: cell.x,
                    y: cell.y,
                    radius: cell.radius,
                    speed: 25
                });
            }
        }

        if (currentPlayer.cells.length < c.limitSplit && currentPlayer.massTotal >= c.defaultPlayerMass * 2) {
            //Split single cell from virus
            if (virusCell) {
                splitCell(currentPlayer.cells[virusCell]);
            } else {
                //Split all cells
                if (currentPlayer.cells.length < c.limitSplit && currentPlayer.massTotal >= c.defaultPlayerMass * 2) {
                    var numMax = currentPlayer.cells.length;
                    for (var d = 0; d < numMax; d++) {
                        splitCell(currentPlayer.cells[d]);
                    }
                }
            }
            currentPlayer.lastSplit = new Date().getTime();
        }
    });
});

function tickPlayer(currentPlayer) {
    if (currentPlayer.lastHeartbeat < new Date().getTime() - c.maxHeartbeatInterval) {
        sockets[currentPlayer.id].emit('kick', 'Vous êtes inactif depuis ' + c.maxHeartbeatInterval / 1000 + ' seconde.');
        sockets[currentPlayer.id].disconnect();
    }

    movePlayer(currentPlayer);

    function funcFood(f) {
        return SAT.pointInCircle(new V(f.x, f.y), playerCircle);
    }

    function deleteFood(f) {
        food[f] = {};
        food.splice(f, 1);
    }

    function eatMass(m) {
        if (SAT.pointInCircle(new V(m.x, m.y), playerCircle)) {
            if (m.id == currentPlayer.id && m.speed > 0 && z == m.num)
                return false;
            if (currentCell.mass > m.masa * 1.1)
                return true;
        }
        return false;
    }

    function check(user) {
        for (var i = 0; i < user.cells.length; i++) {
            if (user.cells[i].mass > 10 && user.id !== currentPlayer.id) {
                var response = new SAT.Response();
                //var collided = SAT.pointInCircle(new V(user.cells[i].x, user.cells[i].y), playerCircle);
                // var collided = SAT.testCircleCircle(playerCircle,
                //     new C(new V(user.cells[i].x, user.cells[i].y), user.cells[i].radius*2),
                //     response);

                var collided = (playerCircle.r > Math.sqrt(Math.pow(playerCircle.pos.x - user.cells[i].x, 2) + Math.pow(playerCircle.pos.y - user.cells[i].y, 2)));
                if (collided) {

                    console.log("math" + Math.sqrt(Math.pow(currentCell.x - user.cells[i].x, 2) + Math.pow(currentCell.y - user.cells[i].y, 2)));
                    console.log("radius" + currentCell.radius);
                    response.aUser = currentCell;
                    response.bUser = {
                        id: user.id,
                        name: user.name,
                        x: user.cells[i].x,
                        y: user.cells[i].y,
                        num: i,
                        mass: user.cells[i].mass
                    };
                    playerCollisions.push(response);
                    console.log("collision");
                }
            }
        }
        return true;
    }

    function collisionCheck(collision) {
        if (collision.aUser.mass > collision.bUser.mass * 1.1 && collision.aUser.radius > Math.sqrt(Math.pow(collision.aUser.x - collision.bUser.x, 2) + Math.pow(collision.aUser.y - collision.bUser.y, 2)) * 1.1) {
            console.log('[DEBUG] Killing user: ' + collision.bUser.id);

            var numUser = util.findIndex(users, collision.bUser.id);
            if (numUser > -1) {
                if (users[numUser].cells.length > 1) {
                    users[numUser].massTotal -= collision.bUser.mass;
                    users[numUser].cells.splice(collision.bUser.num, 1);
                } else {
                    users.splice(numUser, 1);
                    sockets[collision.bUser.id].emit('RIP', collision.aUser);
                }
            }
            currentPlayer.massTotal += collision.bUser.mass;
            collision.aUser.mass += collision.bUser.mass;
        }
    }

    for (var z = 0; z < currentPlayer.cells.length; z++) {
        var currentCell = currentPlayer.cells[z];
        currentCell.name = currentPlayer.name;
        var playerCircle = new C(
            new V(currentCell.x, currentCell.y),
            currentCell.radius
        );

        var foodEaten = food.map(funcFood)
            .reduce(function(a, b, c) {
                return b ? a.concat(c) : a;
            }, []);

        foodEaten.forEach(deleteFood);

        var massEaten = massFood.map(eatMass)
            .reduce(function(a, b, c) {
                return b ? a.concat(c) : a;
            }, []);

        var virusCollision = virus.map(funcFood)
            .reduce(function(a, b, c) {
                return b ? a.concat(c) : a;
            }, []);

        if (virusCollision > 0 && currentCell.mass > virus[virusCollision].mass) {
            sockets[currentPlayer.id].emit('virusSplit', z);
        }

        var masaGanada = 0;
        for (var m = 0; m < massEaten.length; m++) {
            masaGanada += massFood[massEaten[m]].masa;
            massFood[massEaten[m]] = {};
            massFood.splice(massEaten[m], 1);
            for (var n = 0; n < massEaten.length; n++) {
                if (massEaten[m] < massEaten[n]) {
                    massEaten[n]--;
                }
            }
        }

        if (typeof(currentCell.speed) == "undefined")
            currentCell.speed = 6.25;
        masaGanada += (foodEaten.length * c.foodMass);
        currentCell.mass += masaGanada;
        currentPlayer.massTotal += masaGanada;
        currentCell.radius = util.massToRadius(currentCell.mass);
        playerCircle.r = currentCell.radius;


        var playerCollisions = [];
        users.forEach(check);
        playerCollisions.forEach(collisionCheck);
    }
}

function moveloop() {
    for (var i = 0; i < users.length; i++) {
        tickPlayer(users[i]);
    }
    for (i = 0; i < massFood.length; i++) {
        if (massFood[i].speed > 0) moveMass(massFood[i]);
    }
}

function gameloop() {
    if (users.length > 0) {
        users.sort(function(a, b) {
            return b.massTotal - a.massTotal;
        });

        var topUsers = [];

        for (var i = 0; i < Math.min(10, users.length); i++) {
            if (users[i].type == 'player') {
                topUsers.push({
                    id: users[i].id,
                    name: users[i].name
                });
            }
        }
        if (isNaN(leaderboard) || leaderboard.length !== topUsers.length) {
            leaderboard = topUsers;
            leaderboardChanged = true;
        } else {
            for (i = 0; i < leaderboard.length; i++) {
                if (leaderboard[i].id !== topUsers[i].id) {
                    leaderboard = topUsers;
                    leaderboardChanged = true;
                    break;
                }
            }
        }
        for (i = 0; i < users.length; i++) {
            for (var z = 0; z < users[i].cells.length; z++) {
                if (users[i].cells[z].mass * (1 - (c.massLossRate / 1000)) > c.defaultPlayerMass && users[i].massTotal > c.minMassLoss) {
                    var massLoss = users[i].cells[z].mass * (1 - (c.massLossRate / 1000));
                    users[i].massTotal -= users[i].cells[z].mass - massLoss;
                    users[i].cells[z].mass = massLoss;
                }
            }
        }
    }
    balanceMass();
}

function sendUpdates() {
    users.forEach(function(u) {
        // center the view if x/y is undefined, this will happen for spectators
        u.x = u.x || c.gameWidth / 2;
        u.y = u.y || c.gameHeight / 2;

        var visibleFood = food
            .map(function(f) {
                if (f.x > u.x - u.screenWidth / 2 - 20 &&
                    f.x < u.x + u.screenWidth / 2 + 20 &&
                    f.y > u.y - u.screenHeight / 2 - 20 &&
                    f.y < u.y + u.screenHeight / 2 + 20) {
                    return f;
                }
            })
            .filter(function(f) {
                return f;
            });

        var visibleVirus = virus
            .map(function(f) {
                if (f.x > u.x - u.screenWidth / 2 - f.radius &&
                    f.x < u.x + u.screenWidth / 2 + f.radius &&
                    f.y > u.y - u.screenHeight / 2 - f.radius &&
                    f.y < u.y + u.screenHeight / 2 + f.radius) {
                    return f;
                }
            })
            .filter(function(f) {
                return f;
            });

        var visibleMass = massFood
            .map(function(f) {
                if (f.x + f.radius > u.x - u.screenWidth / 2 - 20 &&
                    f.x - f.radius < u.x + u.screenWidth / 2 + 20 &&
                    f.y + f.radius > u.y - u.screenHeight / 2 - 20 &&
                    f.y - f.radius < u.y + u.screenHeight / 2 + 20) {
                    return f;
                }
            })
            .filter(function(f) {
                return f;
            });

        var visibleCells = users
            .map(function(f) {
                for (var z = 0; z < f.cells.length; z++) {
                    if (f.cells[z].x + f.cells[z].radius > u.x - u.screenWidth / 2 - 20 &&
                        f.cells[z].x - f.cells[z].radius < u.x + u.screenWidth / 2 + 20 &&
                        f.cells[z].y + f.cells[z].radius > u.y - u.screenHeight / 2 - 20 &&
                        f.cells[z].y - f.cells[z].radius < u.y + u.screenHeight / 2 + 20) {
                        z = f.cells.lenth;
                        if (f.id !== u.id) {
                            return {
                                id: f.id,
                                x: f.x,
                                y: f.y,
                                cells: f.cells,
                                massTotal: Math.round(f.massTotal),
                                hue: f.hue,
                                name: f.name,
                                picture: f.picture
                            };
                        } else {
                            //console.log("Nombre: " + f.name + " Es Usuario");
                            return {
                                x: f.x,
                                y: f.y,
                                cells: f.cells,
                                massTotal: Math.round(f.massTotal),
                                hue: f.hue,
                                picture: f.picture
                            };
                        }
                    }
                }
            })
            .filter(function(f) {
                return f;
            });

        sockets[u.id].emit('serverTellPlayerMove', visibleCells, visibleFood, visibleMass, visibleVirus);
        if (leaderboardChanged) {
            sockets[u.id].emit('leaderboard', {
                players: users.length,
                leaderboard: leaderboard
            });
        }
    });
    leaderboardChanged = false;
}

setInterval(moveloop, 1000 / 60);
setInterval(gameloop, 1000);
setInterval(sendUpdates, 1000 / c.networkUpdateFactor);

// Don't touch, IP configurations.
var ipaddress = process.env.OPENSHIFT_NODEJS_IP || process.env.IP || '0.0.0.0';
var serverport = process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || c.port;
http.listen(serverport, ipaddress, function() {
    console.log('[DEBUG] Listening on ' + ipaddress + ':' + serverport);
});
