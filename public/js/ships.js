// connect to the server using socket
var socket = io();

// global 'me' == current user name TODO -> should get this from session..
var hostname = null;
var guestname = null;
var currentGameIndex = null;
var currentGameState = null;
var token = null;

// actual game states (for checking internal game state, do not serve to clients ui)
var STATE = {
    CREATED: "WAITING FOR THE OPPONENT",
    HANDSHAKING: "HANDSHAKING",
    STARTED: "IN PROGRESS",
    END: "GAME FINISHED"
};

/*
 * main functions
 */

function newGame(id) {

    $.get('/game').then(function (data) {
        $('.container').replaceWith(data);
        createGame(id);
    });

}

function createGame(username) {

    socket.emit('sck_creategame', username, function (data) {
        hostname = me;
        currentGameIndex = data.gameIndex;
        currentGameState = data.gameState;
        $('#gameInfo').removeClass('invisible').html(
            'Game hosted successfully! ( <b> ' + hostname + '</b> versus <b> ? </b>) Waiting for the opponent..'
        ).addClass('awaiting');
    });

}

function getGames() {

    socket.emit('sck_getgames', function (data) {

        var games = '<tbody id=\"gameList\">';
        if (data.gameList.length < 1) {
            games += "<tr><td colspan='5' class='text-center' style='opacity: .5'><i class='fa fa-2x fa-ship text-center' style='display: block'></i> No games available for now..</td></tr>"
        } else {
            for (var i = 0; i < data.gameList.length; i++) {
                var l = data.gameList[i];
                games += "\
                <tr>\
                    <td>Game no. " + (l.gameIndex + 1) + "</td>\
                    <td class='col-md-2'>Hosted by: " + "<span style='color: #5883b7'>" + l.hostname + "</span></td>\
                    <td class='col-md-2'>Guest:  " + "<span style='color: #ff5e7c'>" + (l.guestname || " -- ") + "</span></td>\
                    <td class='col-md-4'>" + l.gameState + "</td>\
                    <td id='joinBtn'";
                if (l.gameState !== STATE.CREATED) {
                    games+= "style=' display: none'";
                } else {
                    games += "class='text-center' onclick=\"joinGame" + "('" + l.gameIndex + "')\"" + "</td>" + "<i class='fa fa-play'></i></td>"
                }
            }
        }
        games += "</tbody></table>";
        $('#gameList').replaceWith(games);
        $('#gameList').hide().fadeIn(2000);

    });

}

function joinGame(id) {

    $.get('/game').then(function (data) {
        $('.container').replaceWith(data);
        connectGame(id);
    });

}

function connectGame(id) {

    socket.emit('connect_game', id, me, function(err, data) {
        if (err) {
            alert('Oops! Can\'t connect to this game.. Please try again or pick different game');
            location.reload();
        } else {
            currentGameIndex = data.gameIndex;
            currentGameState = data.gameState;
            hostname = data.hostname;
            guestname = me;
            $('#gameInfo').removeClass('invisible').html(
                'Connecting to <b>' + hostname + '</b>..'
            );
            $('#gameInfo').addClass('connecting');
            $('#gameInfo').removeClass('connecting').html(
                '<b>' + me + '</b> versus <b>' + hostname + '</b> ..GET READY!'
            ).addClass('connected');
            if (data.hostReady) {
                $('#guestStateButton').addClass('ready');
                $('#guestState').find('i').replaceWith('<i class="fa fa-thumbs-o-up suggestion"></i>');
            }
        }
    });

}

function leaveGame(username) {

    $.get('/users').then(function (data) {
        $('.container').replaceWith(data);
        socket.emit('sck_leavegame', currentGameIndex, me, function (data) {
            if (data) {
                /*alert(data.msg); // TODO handle this on index (users) page in a div or sth*/
            }
            nullifyGame();
        });
        getGames();
    });

}

function nullifyGame() {

    currentGameIndex = null;
    currentGameState = null;
    hostname = null;
    guestname = null;

}

// get a fresh list of games
getGames();

/*
 *  initialize in-game main functions and variables
 */

function init() {

    you = $('td.friendlyWater');
    enemy = $('td.enemyWater');
    DEF_ANIM_TIME = 300;
    hinter = true;

    // display error from the server running callback function
    showHint = function (msg) {

        $('#hint').html('<i class="fa fa-2x fa-exclamation-triangle" style="padding: .3em"></i>' + msg).fadeIn(DEF_ANIM_TIME, function () {
            $(this).delay(1000).fadeOut(DEF_ANIM_TIME);
        });

    };

    // get your coordinates
    getYourCoord = function (data) {

        var ss = "div[id^=crd-you-" + data.tX + data.tY + "]";
        return $(ss).parent();

    };

    // get opponent coordinates
    getEnemyCoord = function (data) {

        var ss = "div[id^=crd-enemy-" + data.tX + data.tY + "]";
        return $(ss).parent();

    };

    // helper function to do some animation on the blocks using css classes
    animateLostShip = function (data, player) {

        var d = {};
        for (var i = 0; i < data.sunk.blocks.length; i++) {
            d.tX = Number(data.sunk.blocks[i].x);
            d.tY = Number(data.sunk.blocks[i].y);
            if (player === me) {
                getYourCoord(d).removeClass('hit').addClass('sunk');
            } else {
                getEnemyCoord(d).removeClass('hit').addClass('sunk');
                applyHinter();
            }
        }

    };

    // set ready status
    readyUp = function () {

        var data = {
            gameIndex: currentGameIndex,
            user: me
        };
        socket.emit('sck_ready', data, function (err, data) {
            if (err) {
                showHint(err);
            } else {
                if (data) {
                    $('#hostStateButton').addClass('ready');
                    $('#hostState').find('i').replaceWith('<i class="fa fa-thumbs-o-up ready"></i>');
                } else {
                    $('#hostStateButton').removeClass('ready');
                    $('#hostState').find('i').replaceWith('<i class="fa fa-hand-paper-o"></i>');
                }
            }
        });

    };

    // give the opponent chance to shot
    exchangeToken = function () {

        token = false; // TODO: handle checking on the server
        socket.emit('sck_token', currentGameIndex);

    };

    // helper
    checkSunkenBlock = function (td) {

        if (!td.hasClass('sunk') && !td.hasClass('assumedEmpty')) {
            td.addClass('assumedEmpty');
        }

    };

    // toggle class depending on hinter var
    applyHinter = function() {

        if (hinter) {
            var td;
            for (var i = 0; i < 10; i++) {
                for (var j = 0; j < 10; j++) {
                    td = $('#crd-enemy-' + i + j).parent();
                    if (td.hasClass('sunk')) {
                        if (i - 1 >= 0) {
                            if ((j - 1) >= 0) {
                                checkSunkenBlock($('#crd-enemy-' + (i - 1) + (j - 1)).parent());
                            }
                            checkSunkenBlock($('#crd-enemy-' + (i - 1) + j).parent());
                            if ((j + 1) <= 9) {
                                checkSunkenBlock($('#crd-enemy-' + (i - 1) + (j + 1)).parent());
                            }
                        }
                        if ((j - 1) >= 0) {
                            checkSunkenBlock($('#crd-enemy-' + (i) + (j - 1)).parent());
                        }
                        if ((j + 1) <= 9) {
                            checkSunkenBlock($('#crd-enemy-' + (i) + (j + 1)).parent());
                        }
                        if ((i + 1) <= 9) {
                            if ((j - 1) >= 0) {
                                checkSunkenBlock($('#crd-enemy-' + (i + 1) + (j - 1)).parent());
                            }
                            checkSunkenBlock($('#crd-enemy-' + (i + 1) + j).parent());
                            if ((j + 1) <= 9) {
                                checkSunkenBlock($('#crd-enemy-' + (i + 1) + (j + 1)).parent());
                            }
                        }
                    }
                }
            }
        } else {
            for (var i = 0; i < 10; i++) {
                for (var j = 0; j < 10; j++) {
                    td = $('#crd-enemy-' + i + j).parent();
                    if (td.hasClass('assumedEmpty')) td.removeClass('assumedEmpty');
                }
            }
        }

    };

    // toggle hinter ( will display empty blocks around sunken ships )
    toggleHinter = function () {

        hinter = !hinter;
        hinter ? $('#hinterTooltip').find('i').replaceWith('<i class="fa fa-check-square suggestion"></i>') : $('#hinterTooltip').find('i').replaceWith('<i class="fa fa-check-square-o suggestion"></i>');
        applyHinter();

    };

    // handle placement ( friendly ships )
    you.click(function () {

        if (currentGameState !== STATE.STARTED && currentGameState !== STATE.END) { // TODO: handle on the server
            var clicked = $(this).find('.box').attr('id').substr(8);
            var target = {
                gameIndex: currentGameIndex,
                user: me,
                tX: clicked.charAt(0),
                tY: clicked.charAt(1)
            };
            socket.emit("sck_place", target, function (err, data) {
                if (err) {
                    showHint(err);
                } else {
                    getYourCoord(data).toggleClass('placed');
                }
            });
        }

    });

    // handle shooting ( enemy ships )
    enemy.click(function () {

        if (currentGameState === STATE.STARTED && currentGameState !== STATE.END) { // TODO: handle on the server
            if (token === true) {
                var clicked = $(this).find('.box').attr('id').substr(10);
                var target = {
                    gameIndex: currentGameIndex,
                    user: me,
                    tX: clicked.charAt(0),
                    tY: clicked.charAt(1)
                };
                socket.emit("sck_shot", target, function (err, data) {
                    if (err) {
                        showHint(err);
                    } else {
                        if (data.hit) {
                            getEnemyCoord(data).addClass('hit');
                            if (data.sunk.status) {
                                animateLostShip(data);
                                $('#gameInfo').fadeOut(DEF_ANIM_TIME).text("Wrecked! Shoot again!").fadeIn(DEF_ANIM_TIME);
                            } else {
                                $('#gameInfo').fadeOut(DEF_ANIM_TIME).text("Hit! Shoot again!").fadeIn(DEF_ANIM_TIME);
                            }
                        } else {
                            getEnemyCoord(data).addClass('miss');
                            $('#gameInfo').fadeOut(DEF_ANIM_TIME).text("Ups.. you missed! Wait for your turn.").fadeIn(DEF_ANIM_TIME);
                            exchangeToken();
                        }
                        if (data.gameState === STATE.END) { // game has ended
                            currentGameState = STATE.END;
                            $('#gameInfo').addClass('won').text('Game over, you won!');
                            $('#do').find('i').replaceWith('<i class="fa fa-hand-o-left"></i>');
                        }
                    }
                });
            } else {
                showHint('Hey! Wait for your turn!');
            }
        }

    });

}

/*
 *  shared functions for animations
 */

function animateMainContent() {

    // navigation
    $('#gameNav').fadeIn(1000);
    $('#gameTable').fadeIn(1500);

    // tooltips
    // shared
    $('#signOutTooltip').tooltip();
    $('#helpTooltip').tooltip();

    // main only
    $('#refreshTooltip').tooltip();
    $('.newGameTooltip').tooltip();

    // game only
    $('.leaveTooltip').tooltip();
    $('#hinterTooltip').tooltip();
    $('.toggleStatusTooltip').tooltip({
        trigger: 'hover'
    });

}

function animateGameBoard() {

    $('td.friendlyWater').each(function () {
        $(this).delay(300).fadeIn(500);
    });
    $('td.enemyWater').each(function () {
        $(this).delay(300).fadeIn(500);
    });

}

/*
 *  socket event listeners
 */

// hint to update game list
socket.on('sck_refreshgames', function() {

    if (!currentGameIndex) getGames();

});

// someone's connecting
socket.on('sck_updatehostgamestate', function(data) {

    currentGameState = data.gameState;
    guestname = data.guestname;
    $('#gameInfo').removeClass('awaiting').html(
        '<b>' + guestname + '</b> connecting..'
    ).addClass('connecting');
    $('#gameInfo').removeClass('connecting').html(
        '<b>' + me + '</b> versus <b>' + guestname + '</b> ..GET READY!'
    ).addClass('connected');

});

// sets other player ready status
socket.on('sck_updategamestate', function(data) {

    if (data.enemyReady) {
        $('#guestStateButton').addClass('ready');
        $('#guestState').find('i').replaceWith('<i class="fa fa-thumbs-o-up suggestion"></i>');
    } else {
        $('#guestStateButton').removeClass('ready');
        $('#guestState').find('i').replaceWith('<i class="fa fa-hand-paper-o suggestion"></i>');
    }
    if (data.gameState === STATE.STARTED) {
        token = (me === hostname);
        var msg = (token) ? "The game started! It's your turn." : "The game started! Wait for your turn.";
        $('#gameInfo').removeClass('connected').text(msg).addClass('started');
        $('#do').find('i').replaceWith('<i class="fa fa-flag-o suggestion"></i>');
        currentGameState = STATE.STARTED;
    }

});

// helper function
function notifyMaker(type, data) {

    var c;
    switch (type) {
        case 'sck_winnotify':
            c = 'won'; break;
        case 'sck_lostnotify':
            c = 'lost'; break;
        case 'sck_disconnectednotify':
            c = 'alone'; break;
    }
    $('#gameInfo').removeClass('invisible awaiting connecting connected started').addClass(c).text(data.state + ' (' + data.reason + ')');
    $('#do').find('i').replaceWith('<i class="fa fa-hand-o-left suggestion"></i>');
    currentGameState = STATE.END;
    nullifyGame();

}

// show 'you win' info to current user
socket.on('sck_winnotify', function(data) {

    notifyMaker('sck_winnotify', data);

});

// show 'you lost' info to ucurrent ser
// if the game has ended, the winners board is revealed
socket.on('sck_lostnotify', function(data) {

    notifyMaker('sck_lostnotify', data);
    var b = data.board;
    var td; // just start from the first td and go on..
    $('#enemyShips').fadeOut(1000, function() {
        $(this).show();
        for (var i = 0; i < b.length; i++) {
            for (var j = 0; j < b.length; j++) {
                td = $('#crd-enemy-'+i+j).parent();
                if (b[i][j] === 0) {
                    td.addClass('miss').hide().delay((i+1)*100).fadeIn(1000);
                    continue;
                }
                if (b[i][j] === 1) {
                    td.addClass('placed').hide().delay((i+1)*100).fadeIn(1000);
                    continue;
                }
                if (b[i][j] === 2) {
                    td.addClass('hit').hide().delay((i+1)*100).fadeIn(1000);
                }
            }
        }
    });

});

// show 'opponent left the game' info to current user
socket.on('sck_disconnectednotify', function(data) {

    notifyMaker('sck_disconnectednotify', data);

});

// exchanging token
socket.on('sck_token', function() {

    token = true;

});

// owner -1 block
socket.on('sck_hit', function(data) {

    getYourCoord(data).removeClass('placed').addClass('hit');
    if (data.sunk.status) {
        animateLostShip(data, me);
    }

});

// owner is safe
socket.on('sck_miss', function(data) {

    getYourCoord(data).addClass('miss');
    $('#gameInfo').fadeOut(DEF_ANIM_TIME).text("Your move").fadeIn(DEF_ANIM_TIME);

});