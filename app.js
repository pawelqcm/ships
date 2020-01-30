var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');
var passportLocal = require('passport-local');
var expressSession = require('express-session');
var io = require('socket.io');
var lessMiddleware = require('less-middleware');

var routes = require('./routes/index');
var JSONusers = require('./users/users.json'); // ¯\_(ツ)_/¯

var app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(lessMiddleware(__dirname + "/public"));
app.use(express.static(path.join(__dirname, '/public')));

app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js'));
app.use('/js', express.static(__dirname + '/node_modules/jquery/dist'));
app.use('/io', express.static(__dirname + '/node_modules/socket.io-client'));
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));
app.use('/fa', express.static(__dirname + '/node_modules/font-awesome/css'));

// manage auth process
app.use(expressSession({
  secret: process.env.SESSION_SECRET || 'Trkp2FUWKnflEHkzq0hzVHEFqpxdcz',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new passportLocal.Strategy(function(username, password, done) {
  var isAuthed = false;
  if (JSONusers[username] && JSONusers[username].pass === password) {
    isAuthed = true;
  }
  if (isAuthed) {
    done(null, { id: username, name: username});
  } else {
    done(null, null);
  }
}));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  done(null, {id : id, name: id});
});

app.use('/', routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
