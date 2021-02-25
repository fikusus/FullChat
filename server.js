'use strict';

var httpsWorker = require('./app.js');

require('greenlock-express')
    .init({
        packageRoot: __dirname,

        // contact for security and critical bug notices
        maintainerEmail: "penbox1234@gmail.com",

        // where to look for configuration
        configDir: './greenlock.d',

        // whether or not to run at cloudscale
        cluster: false
    })
    // Serves on 80 and 443
    // Get's SSL certificates magically!
    .ready(httpsWorker);
    
    function httpsWorker(glx) {
        var socketio = require("socket.io");
        var io;
    
        // we need the raw https server
        var server = glx.httpsServer();
    
        io = socketio(server);
    
        // Then you do your socket.io stuff
        io.on("connection", function(socket) {
            console.log("a user connected");
            socket.emit("Welcome");
    
            socket.on("chat message", function(msg) {
                socket.broadcast.emit("chat message", msg);
            });
        });
    
        // servers a node app that proxies requests to a localhost
        glx.serveApp(function(req, res) {
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.end("Hello, World!\n\n💚 🔒.js");
        });
    }