var should  = require('should')
  , exec    = require('child_process').exec
  , async   = require('async')
  , path    = require('path')
  , fs      = require('fs')
  , mkdirp  = require('mkdirp')
  , Watcher = require('../lib/watcher').Watcher
  , helper  = require('./test_helper')
  , dir     = helper.testdir
  , data    = helper.data
  , rmdir   = helper.rmdir
  , buildfs = helper.buildfs;

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

    afterEach(function () { watcher.stop(); });

    describe('When watching directories', function () {

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
                if (add) { done(); }
            });

            watcher.on('create', function (file) {
                file.should.equal(f2);
                add = true;
                if (rem) { done(); }
            });

            watcher.start(function (err) {
                should.not.exist(err);
                exec('mv ' + f1 + ' ' + f2, function(err) {
                    should.not.exist(err);
                });
            });
        });

        it('should not follow symbolic links', function (done) {
            var link = path.join(dir, 'tdir2');
            fs.symlinkSync(dir, link, 'dir');

            watcher.start(function (err) {
                should.not.exist(err);
                setTimeout(function () {
                    done();
                }, 200);
            });
        });

        it('should use filters', function (done) {
            var filter = function (name) { return /y\d\.txt/.test(name); };
            watcher    = new Watcher({ dir: dir, filters: { includeFile: filter } });

            watcher.on('change', function (name) {
                name.should.match(/y\d\.txt/);
                done();
            });

            watcher.start(function (err) {
                should.not.exist(err);
                fs.writeFileSync(path.join(dir, data[2].name), Date.now());
                fs.writeFileSync(path.join(dir, data[3].name), Date.now());
                fs.writeFileSync(path.join(dir, data[4].name), Date.now());
            });
        });
    });

    describe('When watching for multiple changes', function () {
        it('should emit on file changed', function (done) {
            var f     = path.join(dir, data[6].name)
              , count = 0;

            watcher = new Watcher({ file: f });

            watcher.on('change', function (file) {
                file.should.equal(f);
                count++;

                if (count === 4) {
                    done();
                }
            });

            async.series([
                function (next) { watcher.start(next); }
              , function (next) {
                    fs.writeFileSync(f, Date.now());
                    setTimeout(next, 1000);
                }
              , function (next) {
                    fs.writeFileSync(f, Date.now());
                    setTimeout(next, 1000);
                }
              , function (next) {
                    exec('echo test2 >> ' + f, function(err) {
                        should.not.exist(err);
                        setTimeout(next, 1000);
                    });
                }
              , function (next) {
                    exec('echo test2 >> ' + f, function(err) {
                        should.not.exist(err);
                    });
                }
            ]);
        });
    });

    describe('When watching single files', function () {
        it('should emit on file changed', function (done) {
            var f = path.join(dir, data[6].name);
            watcher = new Watcher({ file: f });

            watcher.on('change', function (file) {
                file.should.equal(f);
                done();
            });

            watcher.start(function (err) {
                should.not.exist(err);
                fs.writeFileSync(f, Date.now());
            });
        });

        it('should emit on file deleted', function (done) {
            var f = path.join(dir, data[6].name);
            watcher = new Watcher({ file: f });

            watcher.on('delete', function (file) {
                file.should.equal(f);
                done();
            });

            watcher.start(function (err) {
                should.not.exist(err);
                fs.unlinkSync(f);
            });
        });

        it('should emit on symlink', function (done) {
            var file    = path.join(dir, data[6].name)
              , link    = path.join(dir, 'link1')
              , watcher = new Watcher({ file: link });

            fs.symlinkSync(file, link, 'file');

            watcher.on('change', function (name) {
                if (name === link) {
                    done();
                }
            });

            watcher.start(function (err) {
                should.not.exist(err);
                fs.writeFileSync(file, Date.now());
            });
        });
    });
});
