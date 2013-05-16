# Filesystem watcher

*Watch your files and folders*

##Quickstart

Watching files in a directory is as simple as instantiating a watcher and handling  
events emitted when files get created, changed, or deleted.

```javascript
Var Watcher = require('watchfs').Watcher;

var watcher = new Watcher({
    dir: 'path-to-my-dir',
    filters: {
        includeFile: function(name) {
            return /\.js/.test(name);
        }
    });

watcher.on('create', function(name) {
    console.log('file ' + name + ' created');
});

watcher.on('change', function(name) {
    console.log('file ' + name + ' changed');
});
```



NOTES: 
* Not tested on Windows
* Internally it uses fs.watch which could throw an EMFILE error when watching too many files. In those cases ulimit needs to be increased. Use the [posix](https://github.com/melor/node-posix) module to increase the ulimit from within a node js process.
