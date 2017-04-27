var SHIPS = {
    games: [], // all games will be pushed here
    activeGames: 0,
    checked: [], // helper array for checking placements & shots

    TOTAL_SEGMENTS: 20,
    MAX_SEGMENTS: 4,
    NOTICE: {
        WIN: 'win',
        LOST: 'lost',
        LEFT: 'left',
        REFRESH: 'refresh'
    },
    STATE: {
        CREATED: "WAITING FOR THE OPPONENT",
        HANDSHAKING: "HANDSHAKING",
        STARTED: "IN PROGRESS",
        END: "GAME FINISHED"
    }
};

module.exports = function (socket, io) {

    // players sockets id will be added to the game object
    var sid = socket.id;

    // construct new game obj with given username as the hostname and socket.id as host sid
    function Game(username) {

        var hostBoard = [],
            guestBoard = [];
        for (var i = 0; i < 10; i++) {
            hostBoard[i] = [];
            guestBoard[i] = [];
            for (var j = 0; j < 10; j++) {
                hostBoard[i][j] = 0;
                guestBoard[i][j] = 0;
            }
        }
        this.sid = {
            hostSid: sid,
            guestSid: null
        };
        this.gameIndex = SHIPS.games.length;
        this.gameState = SHIPS.STATE.CREATED;
        this.hostBoard = {
            name: username,
            board: hostBoard,
            totalSegments: 0,
            shot: 0,
            ready: false
        };
        this.guestBoard = {
            name: null,
            board: guestBoard,
            totalSegments: 0,
            shot: 0,
            ready: false
        };

    }

    // return specific game by its index
    function getGame(index) {

        var game;
        for (var i = 0; i < SHIPS.games.length; i++) {
            if (SHIPS.games[i] && SHIPS.games[i].gameIndex == index) {
                game = SHIPS.games[i];
            }
        }
        
        return game;

    }

    // return list of games (for the main view with active games)
    function getAllGames() {

        var gameList = [];
        var g;
        for (var i = 0; i < SHIPS.games.length; i++) {
            g = SHIPS.games[i];
            if (g) {
                gameList.push({
                    gameIndex: g.gameIndex,
                    gameState: g.gameState,
                    hostname: g.hostBoard.name,
                    guestname: g.guestBoard.name
                });
            }
        }

        return gameList;

    }

    // reset checked arr
    function clearChecked() {

        SHIPS.checked = [];
        for (var i = 0; i < 10; i++) {
            SHIPS.checked[i] = [];
            for (var j = 0; j < 10; j++) {
                SHIPS.checked[i][j] = 0;
            }
        }

    }

    // look for touching blocks
    function findSibling(board, i, j, blocks, type) {

        var testType = (type === undefined) ? 1 : 2; // sides or corners

        // sides
        if (i !== 0 && SHIPS.checked[i - 1][j] !== 1 && board[i - 1][j] !== 0) {
            if (testType === 1) {
                if (board[i - 1][j] === 1) {
                    blocks.num++;
                    SHIPS.checked[i - 1][j] = 1;
                    findSibling(board, i - 1, j, blocks, type);
                }
            } else {
                if (board[i - 1][j] === 1) {
                    blocks.res = false;
                    return;
                } else {
                    blocks.num++;
                    blocks.coordinates.push({x: i - 1, y: j});
                    SHIPS.checked[i - 1][j] = 1;
                    findSibling(board, i - 1, j, blocks, type);
                }
            }
        }
        if (j !== 0 && SHIPS.checked[i][j - 1] !== 1 && board[i][j - 1] !== 0) {
            if (testType === 1) {
                if (board[i][j - 1] === 1) {
                    blocks.num++;
                    SHIPS.checked[i][j - 1] = 1;
                    findSibling(board, i, j - 1, blocks, type);
                }
            } else {
                if (board[i][j - 1] === 1) {
                    blocks.res = false;
                    return;
                } else {
                    blocks.num++;
                    blocks.coordinates.push({x: i, y: j - 1});
                    SHIPS.checked[i][j - 1] = 1;
                    findSibling(board, i, j - 1, blocks, type);
                }
            }
        }
        if (j !== 9 && SHIPS.checked[i][j + 1] !== 1 && board[i][j + 1] !== 0) {
            if (testType === 1) {
                if (board[i][j + 1] === 1) {
                    blocks.num++;
                    SHIPS.checked[i][j + 1] = 1;
                    findSibling(board, i, j + 1, blocks, type);
                }
            } else {
                if (board[i][j + 1] === 1) {
                    blocks.res = false;
                    return;
                } else {
                    blocks.num++;
                    blocks.coordinates.push({x: i, y: j + 1});
                    SHIPS.checked[i][j + 1] = 1;
                    findSibling(board, i, j + 1, blocks, type);
                }
            }
        }
        if (i !== 9 && SHIPS.checked[i + 1][j] !== 1 && board[i + 1][j] !== 0) {
            if (testType === 1) {
                if (board[i + 1][j] === 1) {
                    blocks.num++;
                    SHIPS.checked[i + 1][j] = 1;
                    findSibling(board, i + 1, j, blocks, type);
                }
            } else {
                if (board[i + 1][j] === 1) {
                    blocks.res = false;
                    return;
                } else {
                    blocks.num++;
                    blocks.coordinates.push({x: i + 1, y: j});
                    SHIPS.checked[i + 1][j] = 1;
                    findSibling(board, i + 1, j, blocks, type);
                }
            }
        }

        // corners
        if (i !== 0 && j !== 0 && SHIPS.checked[i - 1][j - 1] !== 1 && board[i - 1][j - 1] === 1) {
            if (testType === 2) {
                blocks.res = false;
                return;
            } else {
                blocks.num++;
                SHIPS.checked[i - 1][j - 1] = 1;
                if (SHIPS.checked[i - 1][j] !== 1 && SHIPS.checked[i][j - 1] !== 1) {
                    blocks.res = false;
                }
                findSibling(board, i - 1, j - 1, blocks);
            }
        }
        if (j !== 0 && i !== 9 && SHIPS.checked[i + 1][j - 1] !== 1 && board[i + 1][j - 1] === 1) {
            if (testType === 2) {
                blocks.res = false;
                return;
            } else {
                blocks.num++;
                SHIPS.checked[i + 1][j - 1] = 1;
                if (SHIPS.checked[i][j - 1] !== 1 && SHIPS.checked[i + 1][j] !== 1) {
                    blocks.res = false;
                }
                findSibling(board, i + 1, j - 1, blocks);
            }
        }
        if (j !== 9 && i !== 9 && SHIPS.checked[i + 1][j + 1] !== 1 && board[i + 1][j + 1] === 1) {
            if (testType === 2) {
                blocks.res = false;
                return;
            } else {
                blocks.num++;
                SHIPS.checked[i + 1][j + 1] = 1;
                if (SHIPS.checked[i + 1][j] !== 1 && SHIPS.checked[i][j + 1] !== 1) {
                    blocks.res = false;
                }
                findSibling(board, i + 1, j + 1, blocks);
            }
        }
        if (j !== 9 && i !== 0 && SHIPS.checked[i - 1][j + 1] !== 1 && board[i - 1][j + 1] === 1) {
            if (testType === 2) {
                blocks.res = false;
                return;
            } else {
                blocks.num++;
                SHIPS.checked[i - 1][j + 1] = 1;
                if (SHIPS.checked[i][j + 1] !== 1 && SHIPS.checked[i - 1][j] !== 1) {
                    blocks.res = false;
                }
                findSibling(board, i - 1, j + 1, blocks);
            }
        }
        if (blocks.num > SHIPS.MAX_SEGMENTS && testType === 1) {
            blocks.res = false;
        }

    }

    // check if all the ships are placed correctly
    function checkPlacement(b) {

        clearChecked();
        var blocks = {
            num: 0,
            res: true
        };

        for (var i = 0; i < 10; i++) {
            for (var j = 0; j < 10; j++) {
                if (b.board[i][j] === 1) {
                    if (SHIPS.checked[i][j] !== 1) {
                        blocks.num++;
                        SHIPS.checked[i][j] = 1;
                        findSibling(b.board, i, j, blocks);
                        blocks.num = 0;
                    }
                }
            }
        }

        return blocks.res;

    }

    // check if all blocks of the given ship were hit
    // return coordinates of the blocks
    function checkIfSunk(board, x, y) {

        clearChecked();
        SHIPS.checked[x][y] = 1;
        var blocks = {
            num: 0,
            coordinates: [],
            res: true // true == ship sunk
        };
        blocks.coordinates.push({
            x: Number(x),
            y: Number(y)
        });

        findSibling(board, Number(x), Number(y), blocks, 1);

        var res;
        if (blocks.res) {
            res = {
                alive: false,
                blocks: blocks.coordinates
            }
        } else {
            res = {
                alive: true
            }
        }

        return res;

    }

    // delete game and log
    function removeGame(game) {

        console.log("[SRVSOCKET]: removing game with id : " + game.gameIndex);
        delete SHIPS.games[game.gameIndex];
        SHIPS.activeGames--;
        console.log("[SRVSOCKET]: number of games: " + SHIPS.games.length + " (created) | " + SHIPS.activeGames + " (active)");

    }

    // helper for sending notifications
    function notify(type, game, reason, board) {

        switch (type) {
            case SHIPS.NOTICE.WIN:
                sendWinNotification(game, reason);
                break;
            case SHIPS.NOTICE.LOST:
                sendLostNotification(game, reason, board);
                break;
            case SHIPS.NOTICE.LEFT:
                sendLeftNotification(game, reason);
                break;
            case SHIPS.NOTICE.REFRESH:
                sendRefreshGamesHint();
        }

    }

    function sendWinNotification(game, reason) {

        socket.to(game.gameIndex).emit('sck_winnotify', {
            state: 'Game over, you won!',
            reason: reason
        });

    }

    function sendLostNotification(game, reason, board) {

        socket.to(game.gameIndex).emit('sck_lostnotify', {
            state: 'Game over, you lost!',
            reason: reason, board: board
        });

    }

    function sendLeftNotification(game, reason) {

        socket.to(game.gameIndex).emit('sck_disconnectednotify', {
            state: 'Your opponent left the game!',
            reason: reason
        });

    }

    function sendRefreshGamesHint() {

        io.sockets.emit('sck_refreshgames', null);

    }

    /*
     * socket events handling
     */

    socket.on('sck_creategame', function (username, callback) {

        var game = new Game(username);
        SHIPS.games.push(game);
        SHIPS.activeGames++;
        callback({
            gameIndex: game.gameIndex,
            gameState: game.gameState
        });
        socket.join(game.gameIndex);
        notify(SHIPS.NOTICE.REFRESH);

        console.log('[SRVSOCKET]: new game created by <' + username + '>');
        console.log("[SRVSOCKET]: number of games: " + SHIPS.games.length + " (created) | " + SHIPS.activeGames + " (active)");

    });

    socket.on('sck_getgames', function (callback) {

        callback({gameList: getAllGames()});

    });

    socket.on('connect_game', function (id, guest, callback) {

        var g;
        for (var i = 0; i < SHIPS.games.length; i++) {
            if (SHIPS.games[i] && SHIPS.games[i].gameIndex == id) {
                g = SHIPS.games[i];
            }
        }
        if (g && g.gameState === SHIPS.STATE.CREATED) {
            g.sid.guestSid = sid;
            g.guestBoard.name = guest;
            g.gameState = SHIPS.STATE.HANDSHAKING;
            var res = {
                gameIndex: g.gameIndex,
                gameState: g.gameState,
                hostname: g.hostBoard.name,
                guestname: g.guestBoard.name,
                hostReady: g.hostBoard.ready
            };
            socket.join(id);
            socket.to(id).emit('sck_updatehostgamestate', res);
            callback(null, res);
            notify(SHIPS.NOTICE.REFRESH);
        } else {
            callback('_err');
        }

    });

    socket.on('sck_leavegame', function (gameIndex, username, callback) {

        for (var i = 0; i < SHIPS.games.length; i++) {
            var g = SHIPS.games[i];
            if (g) {
                if (g.gameIndex === gameIndex) {
                    if (g.gameState === SHIPS.STATE.STARTED) {
                        notify(SHIPS.NOTICE.WIN, g, 'user has left the game');
                        callback({msg: 'You lost!'});
                    } else {
                        if (g.gameState !== SHIPS.STATE.END) {
                            notify(SHIPS.NOTICE.LEFT, g, 'user quit');
                            callback({msg: 'Disconnected from the game'});
                        } else {
                            callback(null, null);
                        }
                    }

                    if (sid == g.sid.hostSid || sid == g.sid.guestSid) {
                        socket.leave(g.gameIndex);
                    }
                    removeGame(g);
                    notify(SHIPS.NOTICE.REFRESH);
                    break;
                }
            }
            // if the game is not there, then it was deleted probably because other player got disconnected
            // we don't want do do anything, especially send 'you lost' notification :)
        }

    });

    socket.on('sck_ready', function (data, callback) {

        var g = getGame(data.gameIndex);
        if (g) {
            var b = (data.user === g.hostBoard.name) ? g.hostBoard : g.guestBoard;

            if (g.gameState === SHIPS.STATE.STARTED) {
                callback('The game is in progress! You can\'t go back!');
                return;
            }

            if (g.gameState === SHIPS.STATE.END) {
                callback('The game ended! Go and check out other games!');
                return;
            }

            // game is about to begin
            if (b.totalSegments === SHIPS.TOTAL_SEGMENTS) {
                var correct = checkPlacement(b);
                if (correct) {
                    b.ready = b.ready ? false : true;
                    var res = {
                        gameIndex: g.gameIndex,
                        enemyReady: b.ready
                    };
                    if (g.hostBoard.ready && g.guestBoard.ready) {
                        g.gameState = SHIPS.STATE.STARTED;
                        res.gameState = SHIPS.STATE.STARTED;
                        io.to(g.gameIndex).emit('sck_updategamestate', res);
                        notify(SHIPS.NOTICE.REFRESH);
                    } else {
                        socket.to(g.gameIndex).emit('sck_updategamestate', res);
                    }
                    callback(null, b.ready);
                } else {
                    callback('The ships are not placed correctly!');
                }
            } else {
                callback('Place all the ships at the sea first!');
            }
        }

    });

    socket.on('sck_place', function (data, callback) {

        var g = getGame(data.gameIndex);
        if (g) {
            var b = (data.user === g.hostBoard.name) ? g.hostBoard : g.guestBoard;
            if (g.gameState !== SHIPS.STATE.STARTED && g.gameState !== SHIPS.STATE.END) {
                if (!b.ready) {
                    if (b.board[data.tX][data.tY] === 0) {
                        if (b.totalSegments < SHIPS.TOTAL_SEGMENTS) {
                            b.board[data.tX][data.tY] = 1;
                            b.totalSegments++;
                            callback(null, {tX: data.tX, tY: data.tY});
                        } else {
                            callback('You have no ships left!');
                        }
                    } else {
                        b.board[data.tX][data.tY] = 0;
                        b.totalSegments--;
                        callback(null, {tX: data.tX, tY: data.tY});
                    }
                } else {
                    callback('Set yourself unready to change your ships!');
                }
            } else { // the game is running
                callback('The game has begun!');
            }
        }
    });

    socket.on('sck_shot', function (data, callback) {

        var g = getGame(data.gameIndex);
        if (g) {
            if (g.gameState === SHIPS.STATE.STARTED) {
                var b, ob,
                    resp = {
                        tX: data.tX,
                        tY: data.tY
                    };
                if (data.user === g.guestBoard.name) { // guest shot
                    b = g.hostBoard;
                    ob = g.guestBoard.board;
                } else { // host shot
                    b = g.guestBoard;
                    ob = g.hostBoard.board;
                }
                if (b.board[data.tX][data.tY] === 0) { // miss
                    resp.hit = false;
                    socket.to(g.gameIndex).emit('sck_miss', resp);
                    callback(null, resp);
                    return;
                }
                if (b.board[data.tX][data.tY] === 2) { // already hit
                    // TODO -> may return some info
                    return;
                }
                if (b.board[data.tX][data.tY] === 1) { // hit
                    b.board[data.tX][data.tY] = 2;
                    b.shot++;
                    resp.hit = true;
                    var shipStatus = checkIfSunk(b.board, data.tX, data.tY);
                    var isSunk = !shipStatus.alive;
                    if (isSunk) {
                        resp.sunk =
                            {
                                status: true,
                                blocks: shipStatus.blocks
                            }
                    } else {
                        resp.sunk =
                            {
                                status: false
                            }
                    }
                    if (b.shot === SHIPS.TOTAL_SEGMENTS) {
                        g.gameState = SHIPS.STATE.END;
                        resp.gameState = g.gameState;
                        notify(SHIPS.NOTICE.LOST, g, 'All ships lost!', ob);
                    }
                    socket.to(g.gameIndex).emit('sck_hit', resp);
                    callback(null, resp);
                }
            } else {
                // TODO hint -> game status does not allow shooting
            }
        }

    });

    socket.on('sck_token', function (gameIndex) {

        socket.to(gameIndex).emit('sck_token');

    });

    /*
     * server logging
     */

    console.log("[SRVSOCKET]: user logged in \n[SRVSOCKET]: IP: " + socket.handshake.address + " \n[SRVSOCKET]: SID: " + sid);

    socket.on('disconnect', function (data) {

        console.log("[SRVSOCKET]: user disconnected \n[SRVSOCKET]: IP: " + socket.handshake.address + " \n[SRVSOCKET]: SID: " + sid);
        for (var i = 0; i < SHIPS.games.length; i++) {
            if (SHIPS.games[i]) {
                if (SHIPS.games[i].gameState === SHIPS.STATE.CREATED || SHIPS.games[i].gameState === SHIPS.STATE.HANDSHAKING) {
                    if (SHIPS.games[i].sid.guestSid === sid || SHIPS.games[i].sid.hostSid == sid) {
                        notify(SHIPS.NOTICE.LEFT, SHIPS.games[i], 'user got disconnected');
                        removeGame(SHIPS.games[i]);
                        notify(SHIPS.NOTICE.REFRESH);
                        return;
                    }
                }
                if (SHIPS.games[i].gameState === SHIPS.STATE.STARTED) {
                    if (SHIPS.games[i].sid.guestSid === sid || SHIPS.games[i].sid.hostSid == sid) {
                        notify(SHIPS.NOTICE.WIN, SHIPS.games[i], 'user got disconnected');
                        removeGame(SHIPS.games[i]);
                        notify(SHIPS.NOTICE.REFRESH);
                        return;
                    }
                }
                if (SHIPS.games[i].gameState === SHIPS.STATE.END) {
                    removeGame(SHIPS.games[i]);
                    notify(SHIPS.NOTICE.REFRESH);
                    return;
                }
            }
        }

    });

};