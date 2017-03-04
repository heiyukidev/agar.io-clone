var io = require('socket.io-client');
var ChatClient = require('./chat-client');
var Canvas = require('./canvas');
var global = require('./global');

var socket;
var reason;
var connected = false;
var debug = function(args) {
    if (console && console.log) {
        console.log(args);
    }
};

if (/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)) {
    global.mobile = true;
}
/////heiyuki code
function getUser() {
    document.getElementById('startButton').innerHTML = "<p class='buttonText'>Play</p>";
    $.ajax({
        type: "GET",
        beforeSend: function(request) {
            request.setRequestHeader("Authorization", localStorage.agar_token);
        },
        url: "/logged",
        success: function(response) {
            var user = response;
            localStorage.agar_user = JSON.stringify(user);
        }
    });
}
if (!localStorage.agar_token) {
    var token = window.location.hash.substr(1);
    if (token) {
        localStorage.agar_token = token;
        document.getElementById('startButton').innerHTML = "Play";
        getUser();
    }
} else {
    getUser();
}

function startGame(type) {
    if (localStorage.agar_user && localStorage.agar_token) {
        global.playerName = JSON.parse(localStorage.agar_user).firstName + " " + JSON.parse(localStorage.agar_user).lastName;
        global.playerType = type;

        global.screenWidth = window.innerWidth;
        global.screenHeight = window.innerHeight;

        document.getElementById('logo_delice').style.display = 'block';
        document.getElementById('startButton').style.display = 'none';
        document.getElementById('startMenuWrapper').style.maxHeight = '0px';
        document.getElementById('gameAreaWrapper').style.opacity = 1;
        if (!socket) {
            socket = io({
                query: "type=" + type
            });
            setupSocket(socket);
        }
        if (!global.animLoopHandle)
            animloop();
        socket.emit('respawn');
        window.canvas.socket = socket;
        global.socket = socket;
    } else if (!localStorage.agar_token) {
        window.location.href = "/auth";
    } else if (!localStorage.agar_user && localStorage.agar_token) {
        getUser();
    }
}


window.onload = function() {
    var btn = document.getElementById('startButton'),
        // btnS = document.getElementById('spectateButton'),
        btnLogout = document.getElementById('logoutButton'),
        nickErrorText = document.querySelector('#startMenu .input-error');
    // btnS.onclick = function() {
    //     startGame('spectate');
    // };
    btn.onclick = function() {
        startGame('player');
    };
    if (btnLogout) {
        btnLogout.onclick = function() {
            localStorage.removeItem('agar_token');
            localStorage.removeItem('agar_user');
            window.location.href = "/";
        };
    }
};

// TODO: Break out into GameControls.

var foodConfig = {
    border: 0,
};

var playerConfig = {
    border: 6,
    textColor: '#FFFFFF',
    textBorder: '#000000',
    textBorderSize: 3,
    defaultSize: 30
};

var player = {
    id: -1,
    x: global.screenWidth / 2,
    y: global.screenHeight / 2,
    screenWidth: global.screenWidth,
    screenHeight: global.screenHeight,
    target: {
        x: global.screenWidth / 2,
        y: global.screenHeight / 2
    }
};
global.player = player;

var foods = [];
var viruses = [];
var fireFood = [];
var users = [];
var leaderboard = [];
var target = {
    x: player.x,
    y: player.y
};
global.target = target;

window.canvas = new Canvas();

var c = window.canvas.cv;
var graph = c.getContext('2d');

$("#feed").click(function() {
    socket.emit('1');
    window.canvas.reenviar = false;
});

$("#split").click(function() {
    socket.emit('2');
    window.canvas.reenviar = false;
});

// socket stuff.
function setupSocket(socket) {
    // Handle ping.
    socket.on('pongcheck', function() {
        var latency = Date.now() - global.startPingTime;
        debug('Latency: ' + latency + 'ms');
    });

    // Handle error.
    socket.on('connect_failed', function() {
        socket.close();
        global.disconnected = true;
    });

    socket.on('disconnect', function() {
        socket.close();
        global.disconnected = true;
    });

    // Handle connection.
    socket.on('welcome', function(playerSettings) {
        player = playerSettings;
        player.name = global.playerName;
        player.picture = JSON.parse(localStorage.agar_user).picture;
        player.screenWidth = global.screenWidth;
        player.screenHeight = global.screenHeight;
        player.target = window.canvas.target;
        global.player = player;
        socket.emit('gotit', player);
        global.gameStart = true;
        if (global.mobile) {
            document.getElementById('gameAreaWrapper').removeChild(document.getElementById('chatbox'));
        }
        c.focus();
    });

    socket.on('gameSetup', function(data) {
        global.gameWidth = data.gameWidth;
        global.gameHeight = data.gameHeight;
        resize();
    });

    socket.on('leaderboard', function(data) {
        leaderboard = data.leaderboard;
        var status = '<span class="title">Leaderboard</span>';
        for (var i = 0; i < leaderboard.length; i++) {
            status += '<br />';
            if (leaderboard[i].id == player.id) {
                if (leaderboard[i].name.length !== 0)
                    status += '<span class="me">' + (i + 1) + '. ' + leaderboard[i].name + "</span>";
                else
                    status += '<span class="me">' + (i + 1) + ". An unnamed cell</span>";
            } else {
                if (leaderboard[i].name.length !== 0)
                    status += (i + 1) + '. ' + leaderboard[i].name;
                else
                    status += (i + 1) + '. An unnamed cell';
            }
        }
        //status += '<br />Players: ' + data.players;
        document.getElementById('status').innerHTML = status;
    });


    // Handle movement.
    socket.on('serverTellPlayerMove', function(userData, foodsList, massList, virusList) {
        var playerData;
        for (var i = 0; i < userData.length; i++) {
            if (typeof(userData[i].id) == "undefined") {
                playerData = userData[i];
                i = userData.length;
            }
        }
        if (global.playerType == 'player') {
            var xoffset = player.x - playerData.x;
            var yoffset = player.y - playerData.y;

            player.x = playerData.x;
            player.y = playerData.y;
            player.hue = playerData.hue;
            player.massTotal = playerData.massTotal;
            ///heiyuki code
            if (player.massMax) {
                if (player.massMax < playerData.massTotal) {
                    document.getElementById("agarnumber").innerHTML = "Score : " + playerData.massTotal;
                    player.massMax = playerData.massTotal;
                }
            } else {
                document.getElementById("agarnumber").innerHTML = "Score : " + playerData.massTotal;

                player.massMax = playerData.massTotal;
            }
            player.cells = playerData.cells;
            player.xoffset = isNaN(xoffset) ? 0 : xoffset;
            player.yoffset = isNaN(yoffset) ? 0 : yoffset;
        }
        users = userData;
        foods = foodsList;
        viruses = virusList;
        fireFood = massList;
    });

    // Death.
    socket.on('RIP', function(killer) {
        global.gameStart = false;
        global.died = true;
        global.killer = killer;
        socket.emit('massMax', {
            token: localStorage.agar_token,
            value: player.massMax
        });
        window.setTimeout(function() {
            document.getElementById('startButton').style.display = 'block';
            document.getElementById('logo_delice').style.display = 'none';
            document.getElementById('gameAreaWrapper').style.opacity = 0;
            document.getElementById('startMenuWrapper').style.maxHeight = '1000px';
            global.died = false;
            if (global.animLoopHandle) {
                window.cancelAnimationFrame(global.animLoopHandle);
                global.animLoopHandle = undefined;
            }
        }, 10000);
    });

    socket.on('kick', function(data) {
        global.gameStart = false;
        reason = data;
        global.kicked = true;
        socket.close();
    });

    socket.on('virusSplit', function(virusCell) {
        socket.emit('2', virusCell);
        reenviar = false;
    });
}
/*drawing food and green obstacles */
function drawCircle(centerX, centerY, radius, sides) {
    var theta = 0;
    var x = 0;
    var y = 0;

    graph.beginPath();

    for (var i = 0; i < sides; i++) {
        theta = (i / sides) * 2 * Math.PI;
        x = centerX + radius * Math.sin(theta);
        y = centerY + radius * Math.cos(theta);
        graph.lineTo(x, y);
    }

    graph.closePath();
    graph.stroke();
    graph.fill();
}
/* ENDdrawing food and green obstacles */
function drawFood(food) {
    graph.strokeStyle = 'hsl(' + food.hue + ', 100%, 45%)';
    graph.fillStyle = 'hsl(' + food.hue + ', 100%, 50%)';
    graph.lineWidth = foodConfig.border;
    drawCircle(food.x - player.x + global.screenWidth / 2,
        food.y - player.y + global.screenHeight / 2,
        food.radius, global.foodSides);
}

function drawVirus(virus) {
    graph.strokeStyle = virus.stroke;
    graph.fillStyle = virus.fill;
    graph.lineWidth = virus.strokeWidth;
    drawCircle(virus.x - player.x + global.screenWidth / 2,
        virus.y - player.y + global.screenHeight / 2,
        virus.radius, global.virusSides);
}

function drawFireFood(mass) {
    graph.strokeStyle = 'hsl(' + mass.hue + ', 100%, 45%)';
    graph.fillStyle = 'hsl(' + mass.hue + ', 100%, 50%)';
    graph.lineWidth = playerConfig.border + 10;
    drawCircle(mass.x - player.x + global.screenWidth / 2,
        mass.y - player.y + global.screenHeight / 2,
        mass.radius - 5, 18 + (~~(mass.masa / 5)));
}


function drawPlayers(order) {
    var start = {
        x: player.x - (global.screenWidth / 2),
        y: player.y - (global.screenHeight / 2)
    };

    for (var z = 0; z < order.length; z++) {
        var userCurrent = users[order[z].nCell];
        var cellCurrent = users[order[z].nCell].cells[order[z].nDiv];

        var x = 0;
        var y = 0;

        var points = 30 + ~~(cellCurrent.mass / 5);
        var increase = Math.PI * 2 / points;

        graph.strokeStyle = 'hsl(' + userCurrent.hue + ', 50%, 45%)';
        graph.fillStyle = 'hsl(' + userCurrent.hue + ', 100%, 50%)';
        graph.lineWidth = playerConfig.border;
        var xstore = [];
        var ystore = [];

        global.spin += 0.0;

        var circle = {
            x: cellCurrent.x - start.x,
            y: cellCurrent.y - start.y
        };

        for (var i = 0; i < points; i++) {

            x = cellCurrent.radius * Math.cos(global.spin) + circle.x;
            y = cellCurrent.radius * Math.sin(global.spin) + circle.y;
            if (typeof(userCurrent.id) == "undefined") {
                x = valueInRange(-userCurrent.x + global.screenWidth / 2,
                    global.gameWidth - userCurrent.x + global.screenWidth / 2, x);
                y = valueInRange(-userCurrent.y + global.screenHeight / 2,
                    global.gameHeight - userCurrent.y + global.screenHeight / 2, y);
            } else {
                x = valueInRange(-cellCurrent.x - player.x + global.screenWidth / 2 + (cellCurrent.radius / 3),
                    global.gameWidth - cellCurrent.x + global.gameWidth - player.x + global.screenWidth / 2 - (cellCurrent.radius / 3), x);
                y = valueInRange(-cellCurrent.y - player.y + global.screenHeight / 2 + (cellCurrent.radius / 3),
                    global.gameHeight - cellCurrent.y + global.gameHeight - player.y + global.screenHeight / 2 - (cellCurrent.radius / 3), y);
            }
            global.spin += increase;
            xstore[i] = x;
            ystore[i] = y;
        }


        for (i = 0; i < points; ++i) {
            if (i === 0) {
                graph.beginPath();
                graph.moveTo(xstore[i], ystore[i]);
            } else if (i > 0 && i < points - 1) {
                graph.lineTo(xstore[i], ystore[i]);
            } else {
                graph.lineTo(xstore[i], ystore[i]);
                graph.lineTo(xstore[0], ystore[0]);
            }

        }
        graph.lineJoin = 'round';
        graph.lineCap = 'round';

        //yesmine
        //==========================================
        //drawing circle image
        var imageObj = new Image();
        imageObj.src = order[z].picture; // var imageObj = new Image();
        // imageObj.src = order[z].picture;
        // imageObj.onload = function() {
        // imageObj.setAttribute("style", "border-radius:50%");
        // }
        var size = cellCurrent.radius;
        // var tmpCanvas = document.createElement('canvas');
        // var tmp = tmpCanvas.getContext('2d');
        // tmp.beginPath();
        // tmp.arc(size, size, size, 0, Math.PI * 2);
        // tmp.closePath();
        // tmp.clip(); // draw the image into the clipping region
        // tmp.drawImage(imageObj, 0, 0, size * 2, size * 2); // restore the context to its unaltered state
        // tmp.restore();

        //graph.strokeStyle = 'hsl(' + userCurrent.hue + ', 100%, 45%)';
        graph.fillStyle = 'hsl(' + userCurrent.hue + ', 100%, 50%)';
        graph.lineWidth = playerConfig.border;
        //graph.stroke();
        graph.fill();
        graph.drawImage(imageObj, circle.x - size, circle.y - size, size * 2, size * 2);
        //=======================================================
        // end draw image

        var nameCell = "";
        if (typeof(userCurrent.id) == "undefined")
            nameCell = player.name;
        else
            nameCell = userCurrent.name;

        var fontSize = Math.max(cellCurrent.radius / 3, 12);
        graph.lineWidth = playerConfig.textBorderSize;
        graph.fillStyle = playerConfig.textColor;
        graph.strokeStyle = playerConfig.textBorder;
        graph.miterLimit = 1;
        graph.lineJoin = 'round';
        graph.textAlign = 'center';
        graph.textBaseline = 'middle';
        graph.font = 'bold ' + fontSize + 'px comic sans ms';

        if (global.toggleMassState === 0) {
            graph.strokeText(nameCell, circle.x, circle.y + size * 1.5);
            graph.fillText(nameCell, circle.x, circle.y + size * 1.5);
        } else {
            graph.strokeText(nameCell, circle.x, circle.y + size * 1.5);
            graph.fillText(nameCell, circle.x, circle.y + size * 1.5);
            graph.font = 'bold ' + Math.max(fontSize / 3 * 2, 10) + 'px comic sans ms';
            if (nameCell.length === 0) fontSize = 0;
            graph.strokeText(Math.round(cellCurrent.mass), circle.x, circle.y + fontSize + size * 1.5);
            graph.fillText(Math.round(cellCurrent.mass), circle.x, circle.y + fontSize + size * 1.5);
        }
    }
}

function valueInRange(min, max, value) {
    return Math.min(max, Math.max(min, value));
}

function drawgrid() {
    graph.lineWidth = 1;
    graph.strokeStyle = global.lineColor;
    graph.globalAlpha = 0.15;
    graph.beginPath();

    for (var x = global.xoffset - player.x; x < global.screenWidth; x += global.screenHeight / 18) {
        graph.moveTo(x, 0);
        graph.lineTo(x, global.screenHeight);
    }

    for (var y = global.yoffset - player.y; y < global.screenHeight; y += global.screenHeight / 18) {
        graph.moveTo(0, y);
        graph.lineTo(global.screenWidth, y);
    }

    graph.stroke();
    graph.globalAlpha = 1;
}

window.requestAnimFrame = (function() {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function(callback) {
            window.setTimeout(callback, 1000 / 60);
        };
})();

window.cancelAnimFrame = (function(handle) {
    return window.cancelAnimationFrame ||
        window.mozCancelAnimationFrame;
})();

function animloop() {
    global.animLoopHandle = window.requestAnimFrame(animloop);
    gameLoop();
}

function gameLoop() {
    //heiyuki code
    var deathScreen = new Image();
    deathScreen.src = '../img/scorePlayer.png';
    if (global.died) {
        graph.fillStyle = '#4389bc';
        graph.fillRect(0, 0, global.screenWidth, global.screenHeight);

        graph.drawImage(deathScreen, (global.screenWidth / 2) - 400, (global.screenHeight / 2) - 200);
        graph.textAlign = 'center';
        graph.fillStyle = '#FFFFFF';
        graph.font = 'bold 30px sans-serif';
        graph.fillText(global.killer.name, global.screenWidth / 2 - 100, global.screenHeight / 2);


    } else if (!global.disconnected) {
        if (global.gameStart) {
            graph.fillStyle = global.backgroundColor;
            graph.fillRect(0, 0, global.screenWidth, global.screenHeight);

            drawgrid();

            foods.forEach(drawFood);
            fireFood.forEach(drawFireFood);
            viruses.forEach(drawVirus);

            var orderMass = [];
            for (var i = 0; i < users.length; i++) {
                for (var j = 0; j < users[i].cells.length; j++) {
                    orderMass.push({
                        nCell: i,
                        nDiv: j,
                        mass: users[i].cells[j].mass,
                        picture: users[i].picture
                    });
                }
            }
            orderMass.sort(function(obj1, obj2) {
                return obj1.mass - obj2.mass;
            });

            drawPlayers(orderMass);

            socket.emit('0', window.canvas.target); // playerSendTarget "Heartbeat".

        } else {
            graph.fillStyle = '#333333';
            graph.fillRect(0, 0, global.screenWidth, global.screenHeight);

            graph.textAlign = 'center';
            graph.fillStyle = '#FFFFFF';
            graph.font = 'bold 30px sans-serif';
            graph.fillText('Game Over!', global.screenWidth / 2, global.screenHeight / 2);
        }
    } else {
        graph.fillStyle = '#333333';
        graph.fillRect(0, 0, global.screenWidth, global.screenHeight);

        graph.textAlign = 'center';
        graph.fillStyle = '#FFFFFF';
        graph.font = 'bold 30px sans-serif';
        if (global.kicked) {
            if (reason !== '') {
                graph.fillText('You were kicked for:', global.screenWidth / 2, global.screenHeight / 2 - 20);
                graph.fillText(reason, global.screenWidth / 2, global.screenHeight / 2 + 20);
            } else {
                graph.fillText('You were kicked!', global.screenWidth / 2, global.screenHeight / 2);
            }
        } else {
            graph.fillText('Disconnected!', global.screenWidth / 2, global.screenHeight / 2);
        }
    }
}

window.addEventListener('resize', resize);

function resize() {
    if (!socket) return;

    player.screenWidth = c.width = global.screenWidth = global.playerType == 'player' ? window.innerWidth : global.gameWidth;
    player.screenHeight = c.height = global.screenHeight = global.playerType == 'player' ? window.innerHeight : global.gameHeight;

    if (global.playerType == 'spectate') {
        player.x = global.gameWidth / 2;
        player.y = global.gameHeight / 2;
    }

    socket.emit('windowResized', {
        screenWidth: global.screenWidth,
        screenHeight: global.screenHeight
    });

}
