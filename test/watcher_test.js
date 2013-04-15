var should  = require('should')
  , async   = require('async')
  , exec    = require('child_process').exec
  , path    = require('path')
  , fs      = require('fs')
  , mkdirp  = require('mkdirp')
  , Watcher = require('../lib/watcher').Watcher
  , dir     = path.join(__dirname, 'tdir')
  , data    = [
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
              , s = fs.statSync(p);

            if (f === '.' || f === '..') {
                next();
            } else if (s.isDirectory()) {
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

describe('Watcher', function () {
    var watcher = null;

    beforeEach(function (done) {
        rmdir(dir, function (err) {
            buildfs(function (err) {
                watcher = new Watcher({ dir: dir });
                setTimeout(function () { done(err); }, 1000);
            });
        });
    });

    afterEach(function () {
        watcher.stop();
    });

    it('should emit on file created', function (done) {
        var f = path.join(dir, 'v1.txt');

        watcher.on('create', function (file) {
            file.should.equal(f);
            done();
        });

        watcher.start(function (err) {
            should.not.exist(err);
            fs.writeFileSync(f, Date.now());
        });
    });

    it('should emit on file created in a nested directory', function (done) {
        var d      = path.join(dir, data[1].name)
          , nested = path.join(d, 'n1')
          , f      = path.join(nested, 'f1');

        watcher.on('create', function (file) {
            file.should.equal(f);
            done();
        });

        watcher.start(function (err) {
            should.not.exist(err);
            mkdirp(nested, function (err) {
                should.not.exist(err);
                fs.writeFileSync(f, Date.now());
            });
        });
    });

    it('should emit on file changed in a nested directory', function (done) {
        var d      = path.join(dir, data[1].name)
          , nested = path.join(d, 'n1')
          , f      = path.join(nested, 'f1');

        watcher.on('change', function (file) {
            file.should.equal(f);
            done();
        });

        watcher.start(function (err) {
            should.not.exist(err);
            mkdirp(nested, function (err) {
                should.not.exist(err);
                fs.writeFileSync(f, Date.now());
                setTimeout(function (argument) {
                    fs.writeFileSync(f, Date.now());
                }, 1000);
            });
        });

    });

    it('should emit on file deleted', function (done) {
        var f = path.join(dir, data[7].name)
          , d = path.dirname(f);

        watcher.on('delete', function (file) {
            file.should.equal(f);
            done();
        });

        watcher.start(function (err) {
            should.not.exist(err);
            fs.unlinkSync(f);
        });
    });

    it('should emit on file changed', function (done) {
        var f = path.join(dir, data[7].name);

        watcher.on('change', function (file) {
            file.should.equal(f);
            done();
        });

        watcher.start(function (err) {
            should.not.exist(err);
            fs.writeFileSync(f, Date.now());
        });
    });

    it('should emit delete & create on file moved', function (done) {
        var f1  = path.join(dir, data[7].name)
          , f2  = f1 + '.moved'
          , rem = false
          , add = false;

        watcher.on('delete', function (file) {
            file.should.equal(f1);
            rem = true;
            if (add) {
                done();
            }
        });

        watcher.on('create', function (file) {
            file.should.equal(f2);
            add = true;
            if (rem) {
                done();
            }
        });

        watcher.start(function (err) {
            should.not.exist(err);
            exec('mv ' + f1 + ' ' + f2, function(err) {
                should.not.exist(err);
            });
        });
    });

    xit('should watch single files', function (done) {
        // TODO: implement
        done();
    });

    xit('should watch directories', function (done) {
        // TODO: implement
        done();
    });

    xit('should watch recursively', function (done) {
        // TODO: implement
        done();
    });

    xit('should filter watched files', function (done) {
        // TODO: implement
        done();
    });
});
