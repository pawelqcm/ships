var express = require('express');
var router = express.Router();
var passport = require('passport');

function authCheck() {
    return function (req, res, next) {
        if (req.isAuthenticated()) {
            return next();
        }
        res.redirect('login');
    }
}

router.get('/', authCheck(), function(req, res) {
    res.render('index', {
        isAuthenticated: req.isAuthenticated(),
        user: req.user
    });
});

router.get('/login', function (req, res) {
    res.render('login');
});

router.post('/login', function (req, res, next) {
    passport.authenticate('local', function (err, user) {
        if (err) return next(err); // 500
        if (!user) {
            console.log("[SRV]: auth failed");
            console.log("[SRV]: IP: " + req._remoteAddress);
            return res.render('login', { msg: "Authentication failed!"});
        }
        req.login(user, function (err) {
            if (err) return next(err);
        });
        return res.redirect('/');
    })(req, res, next);
});

router.get('/logout', function (req, res) {
    req.logout();
    res.redirect('login');
});

router.get('/game', authCheck(), function (req, res) {
    res.render('board', {
        isAuthenticated: req.isAuthenticated(),
        user: req.user
    });
});

router.get('/users', authCheck(), function (req, res) {
    res.render('users', {
        isAuthenticated: req.isAuthenticated(),
        user: req.user
    });
});

module.exports = router;
