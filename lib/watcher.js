var fs           = require('fs')
  , EventEmitter = require('events').EventEmitter
  , util         = require('util')
  , pathUtil     = require('path')
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

function buildMap (paths, filters, cb) {
    var map = { bypath: {} };
    trav(paths, function (err, name, stats) {
        if (err) {
            console.log('Error reading file ' + name, err);
            return;
        }

        var add = stats.isDirectory() ? filters.includeDir(name) : filters.includeFile(name);
        if (add) {
            map.bypath[name] = { stats: stats, watcher: null };
        }

        return add;
    }, function (err) {
        cb(err, err ? null : map);
    });
}

function stopWatcher(map, file) {
    var o = map.bypath[file];
    if (o.watcher) {
        o.watcher.close();
        o.watcher = null;
    }
}

function stopWatchers (map) {
    Object.keys(map.bypath).forEach(function (p) {
        stopWatcher(map, p);
    });
}

function initWatchers (map, filters, emitter) {
    Object.keys(map.bypath).forEach(function (p) {
        initWatcher(map, filters, emitter, p);
    });
}

function initWatcher (map, filters, emitter, path) {
    map.bypath[path].watcher = fs.watch(path, function (event, name) {
        var stats = map.bypath[path].stats;

        if (event === 'change' && stats.isFile()) {
            onFileChange(path, map, emitter);
        } else if (event === 'rename' && stats.isDirectory()) {
            onDirRename(path, name, map, emitter, filters)
        }
    });
}

function onFileChange (file, map, emitter) {
    fs.stat(file, function (err, stats) {
        var prev = map.bypath[file].stats
          , curr = stats;

        if (!err && curr.mtime.getTime() !== prev.mtime.getTime()) {
            map.bypath[file].stats = stats;
            fire(emitter, 'change', file);
        }
    });
}

function onDirRename (dir, name, map, emitter, filters) {
    if (!name) { return; }


    name = pathUtil.join(dir, name);
    fs.stat(name, function (err, stats) {
        var prev = map.bypath[name] ? map.bypath[name].stats : null
          , curr = stats || null;

        if (prev === null && curr !== null && curr.nlink >= 1) {
            map.bypath[name] = { stats: curr };
            initWatcher(map, filters, emitter, name);
            if (curr.isFile()) {
                fire(emitter, 'create', name);
            }
        } else if (prev !== null && (curr === null || curr.nlink === 0)) {
            map.bypath[name].stats = null;
            stopWatcher(map, name);
            if (prev.isFile()) {
                fire(emitter, 'delete', name);
            }
        }
    });
}

function fire (emitter, event, path) {
    if (emitter._running) {
        emitter.emit(event, path);
        emitter.emit('any', event, path);
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

    this._paths = options.dir || options.paths || options.files;
    this._paths = util.isArray(this._paths) ? this._paths : [ this._paths ];
    this._paths = this._paths.map(function (p) {
        return pathUtil.resolve(p);
    });
}

util.inherits(Watcher, EventEmitter);

Watcher.prototype.start = function(cb) {
    if (this._running) { return cb(); }

    var self    = this
      , paths   = this._paths
      , filters = this._filters;

    // TODO: the paths should only contain directories
    //       the filters should reflect any files directly specified in paths
    //       the paths & filters init should be done here because it's async

    buildMap(paths, filters, function(err, map) {
        if (err) { return cb(err); }

        initWatchers(map, filters, self);

        self._map     = map;
        self._running = true;

        cb();
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
