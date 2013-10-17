var fs           = require('fs')
  , path         = require('path')
  , EventEmitter = require('events').EventEmitter
  , util         = require('util')
  , pathUtil     = require('path')
  , async        = require('async');

function stat (path, cb) {
    fs.stat(path, function (err, stats) {
        if (err) { return cb(err); }
        fs.lstat(path, function (err, lstats) {
            cb(err, stats, lstats);
        });
    });
}

function trav (paths, fn, cb) {
    async.forEach(paths, function (p, next) {
        stat(p, function (err, stats, lstats) {
            var cont = false;
            if (err) {
                fn(err, p);
                next();
            } else {
                cont = fn(null, p, stats, lstats);
                if (stats.isDirectory() && !lstats.isSymbolicLink()) {
                    if (cont !== false) {
                        fs.readdir(p, function (err, files) {
                            trav(files.map(function (f) {
                                return pathUtil.join(p, f);
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

function escapeRegExp(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

function buildMap (paths, filters, cb) {
    var map = {};
    trav(paths, function (err, name, stats, lstats) {
        if (err) {
            console.log('Error reading file ' + name, err);
            return;
        }

        var add = false;
        if (stats.isDirectory() && !lstats.isSymbolicLink() && filters._allowDir(name)) {
            map[name] = { stats: stats, watcher: null };
            add = true;
        } else if (stats.isFile() && filters._allowFile(name)) {
            map[name] = {
                stats    : stats
              , watcher  : null
              , realPath : lstats.isSymbolicLink() ? fs.readlinkSync(name) : name
              , symlink  : lstats.isSymbolicLink()
            };
            add = true;
        }

        return add;
    }, function (err) {
        cb(err, err ? null : map);
    });
}

function stopWatcher(map, file) {
    var o = map[file];
    if (o.watcher) {
        o.watcher.close();
        o.watcher = null;
    }
}

function stopWatchers (map) {
    Object.keys(map).forEach(function (p) {
        stopWatcher(map, p);
    });
}

function initWatchers (map, emitter) {
    Object.keys(map).forEach(function (p) {
        initWatcher(map, emitter, p);
    });
}

function initWatcher (map, emitter, fullPath) {
    var realPath = map[fullPath].realPath || fullPath;

    map[fullPath].watcher = fs.watch(realPath, function (event, name) {
        var stats    = map[fullPath].stats
          , fullName = null;

        if (event === 'change' && stats.isFile()) {
            onFileChange(fullPath, map, emitter);
        } else if (event === 'rename' && stats.isDirectory()) {
            onDirRename(fullPath, name, map, emitter)
            if (name) {
                fullName = path.join(fullPath, name);
                if (map[fullName]) {
                    onFileChange(fullName, map, emitter);
                }
            }
        }
    });
}

function onFileChange (file, map, emitter) {
    fs.stat(file, function (err, stats) {
        var prev = map[file].stats
          , curr = stats;

        if (!err) {
            map[file].stats = stats;

            if (prev === null) {
                fire(emitter, 'create', file, stats);
            } else if (curr.mtime.getTime() !== prev.mtime.getTime()) {
                fire(emitter, 'change', file, stats);
            }
        }
    });
}

function onDirRename (dir, name, map, emitter) {
    if (!name) { return; }


    name = pathUtil.join(dir, name);
    fs.stat(name, function (err, stats) {
        var prev = map[name] ? map[name].stats : null
          , curr = stats || null;

        if (prev === null && curr !== null && curr.nlink >= 1) {
            map[name] = { stats: curr };
            initWatcher(map, emitter, name);
            if (curr.isFile()) {
                fire(emitter, 'create', name, curr);
            }
        } else if (prev !== null && (curr === null || curr.nlink === 0)) {
            map[name].stats = null;
            stopWatcher(map, name);
            if (prev.isFile()) {
                fire(emitter, 'delete', name, prev);
            }
        }
    });
}

function fire (emitter, event, path, stats) {
    if (emitter._running && emitter._allowFile(path)) {
        emitter.emit(event, path, stats);
        emitter.emit('any', path, event, stats);
    }
}

function Watcher (options) {
    if (!(this instanceof Watcher)) { return new Watcher(options); }

    var truefn = function () { return true; };

    options         = options || {};
    options.filters = options.filters || options.filter || {};

    this._filters = {
        includeDir  : options.filters.includeDir || truefn
      , includeFile : options.filters.includeFile || truefn
    };

    this._paths = options.dir || options.paths || options.files || options.file;
    this._paths = util.isArray(this._paths) ? this._paths : [ this._paths ];
    this._paths = this._paths.map(function (p) {
        return pathUtil.resolve(p);
    });
}

util.inherits(Watcher, EventEmitter);

Watcher.prototype.start = function(cb) {
    if (this._running) { return cb(); }

    var self = this;

    async.reduce(this._paths, { paths: [], filters: {} }, function (acc, name, next) {
        stat(name, function (err, stats, lstats) {
            var dir = null;

            if (err) {
                console.log('Could not access path "' + name + '"', err);
                return next(null, acc);
            }

            if (stats.isDirectory() && !lstats.isSymbolicLink()) {
                acc.paths.push(name);
            } else if (stats.isFile()) {
                dir = path.dirname(name);
                acc.paths.push(dir);
                acc.filters[dir] = acc.filters[dir] || {
                    regex: new RegExp(escapeRegExp(dir))
                  , files: []
                };
                acc.filters[dir].files.push(new RegExp(escapeRegExp(name)));
            }

            next(null, acc);
        });
    }, function (err, acc) {
        var paths   = acc.paths
          , filters = acc.filters;

        self._allowDir  = self._filters.includeDir;
        self._allowFile = function (name) {
            var dir  = path.dirname(name)
              , fpat = null
              , pass = true;

            if (filters[dir]) {
                freg = filters[dir].files;
                pass = !filters[dir].regex.test(name) || freg.some(function (patt) {
                    return patt.test(name);
                });
            }
            return pass && self._filters.includeFile(name);
        };

        buildMap(paths, self, function(err, map) {
            if (err) { return cb(err); }

            initWatchers(map, self);

            self._map     = map;
            self._running = true;

            cb();
        });
    });
};

Watcher.prototype.stop = function() {
    if (this._running) {
        this._running = false;

        stopWatchers(this._map);

        this._map = null;
    }
};

module.exports.Watcher = Watcher;
