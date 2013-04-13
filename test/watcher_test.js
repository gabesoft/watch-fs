var should  = require('should')
  , async   = require('async')
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

function deletefs (cb) {
    fs.rmdir(dir, cb);
}

function buildfs (cb) {
    async.forEachSeries(data, function (d, next) {
        var p = path.join(dir, d.name);
        if (d.type === 'dir') {
            mkdirp(p, next);
        } else {
            fs.writeFile(p, Date.now(), next);
        }
    }, cb);
}

describe('Watcher', function () {
    beforeEach(function (done) {
        deletefs(function (err) {
            buildfs(done);
        });
    });

    it('should emit on file created', function (done) {
        var w = new Watcher({ dir: dir })
          , f = path.join(dir, 'v1.txt');
        w.on('created', function (file) {
            file.should.equal(f);
            done();
        });
        fs.writeFileSync(f, Date.now());
    });

    it('should emit on file deleted', function (done) {
        var f = path.join(dir, data[7])
          , d = path.dirname(f)
          , w = new Watcher({ dir: d });

        w.on('deleted', function (file) {
            file.should.equal(f);
            done();
        });
    });

    it('should emit on file changed', function (done) {
        // TODO: implement
        done();
    });

    it('should emit on file moved', function (done) {
        // TODO: implement
        done();
    });

    it('should watch single files', function (done) {
        // TODO: implement
        done();
    });

    it('should watch directories', function (done) {
        // TODO: implement
        done();
    });

    it('should watch recursively', function (done) {
        // TODO: implement
        done();
    });

    it('should filter watched files', function (done) {
        // TODO: implement
        done();
    });
});
