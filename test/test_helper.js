var fs     = require('fs')
  , path   = require('path')
  , async  = require('async')
  , mkdirp = require('mkdirp')
  , dir    = path.join(__dirname, 'tdir')
  , data   = [
        { name : 'a/b/c',        type : 'dir' }    // 0
      , { name : 'a/b/c/d',      type : 'dir' }    // 1
      , { name : 'x1.txt',       type : 'file' }   // 2
      , { name : 'x2.txt',       type : 'file' }   // 3
      , { name : 'a/y1.txt',     type : 'file' }   // 4
      , { name : 'a/y2.txt',     type : 'file' }   // 5
      , { name : 'a/b/z1.txt',   type : 'file' }   // 6
      , { name : 'a/b/c/w1.txt', type : 'file' }   // 7
    ];

function rmdir (dir, cb) {
    fs.readdir(dir, function (err, files) {
        if (err) { return cb(err); }
        async.forEachSeries(files, function (f, next) {
            var p = path.join(dir, f)
              , s = fs.lstatSync(p);

            if (f === '.' || f === '..') {
                next();
            } else if (s.isDirectory() && !s.isSymbolicLink()) {
                rmdir(p, next);
            } else {
                fs.unlink(p, next);
            }
        }, cb);
    });
}

function buildfs (cb) {
    async.forEachSeries(data, function (d, next) {
        var p = path.join(dir, d.name);
        if (d.type === 'dir') {
            mkdirp(p, next);
        } else {
            fs.writeFile(p, Date.now(), function(err) {
                next(err);
            });
        }
    }, cb);
}

module.exports.rmdir     = rmdir;
module.exports.buildfs   = buildfs;
module.exports.data      = data;
module.exports.testdir   = dir;
module.exports.staticDir = path.join(__dirname, 'tdir.static');
