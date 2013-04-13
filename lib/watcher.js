var fs           = require('fs')
  , EventEmitter = require('events').EventEmitter
  , util         = require('util')
  , path         = require('path')
  , async        = require('async');

function trav (paths, fn, cb) {
    async.forEach(paths, function (p, next) {
        fs.stat(p, function (err, stats) {
            var cont = false;
            if (err) {
                fn(err, p);
                next();
            } else {
                cont = fn(null, p, stats);
                if (stats.isDirectory()) {
                    if (cont) {
                        fs.readdir(p, function (err, files) {
                            trav(files.map(function (f) {
                                return path.join(p, f);
                            }), fn, next);
                        });
                    } else {
                        next();
                    }
                } else {
                    next();
                }
            }
        });
    }, cb);
}

function Watcher (options) {
    if (!(this instanceof Watcher)) { return new Watcher(options); }

    options = options || {};

    this.paths  = options.dir || options.paths || options.files;
    this.filter = options.filter;

    this.paths = util.isArray(this.paths) ? this.paths : [ this.paths ];
    this.paths = this.paths.map(function (p) {
        return path.resolve(p);
    });
}

Watcher.prototype.start = function(cb) {
    if (this.running) { return cb(); }

    // TODO: ensure to skip directories visited when traversing to avoid circular links
    // build map
    // set up watchers
    // handle events

    // set the running flag before returning
};

Watcher.prototype.stop = function() {

};

module.exports.trav = trav; // TODO: remove

/*

 var trav = require('./lib/watcher').trav;
 var count = 0;
 var run = function() { 
 trav(['/work'], function(err, path, stats) {
 console.log(path, stats ? stats.isDirectory() : 'NULL');
 if (stats && stats.isFile()) {
 count++;
 }
 return true;
 }, function () {
 console.log('done');
 });
 };

 */

//var fs = require('fs');
//fs.watch('./scripts', function(ev, name) {
//fs.stat('/work/srunner/scripts/' + name, function(err, stats) {
//if (err) {
//console.log(name, err.code);
//} else {
//console.log(name, stats.uid, stats.mtime.getTime());
//}
//});
//});


// events
//  move (from, to)
//  change (fileName)
//  delete (fileName)
//  create (fileName)
//  any (type, args)

util.inherits(Watcher, EventEmitter);
module.exports.Watcher = Watcher;
