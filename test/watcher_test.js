var should  = require('should')
  , exec    = require('child_process').exec
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

    });

    xit('should filter watched files', function (done) {
        // TODO: implement
        done();
    });
});
