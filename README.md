```
                 _____      ______ ________       
___      _______ __  /_________  /____  __/_______
__ | /| / /  __ `/  __/  ___/_  __ \_  /_ __  ___/
__ |/ |/ // /_/ // /_ / /__ _  / / /  __/ _(__  ) 
____/|__/ \__,_/ \__/ \___/ /_/ /_//_/    /____/  
```

*Watches your files and folders and gets out of the way*

##Quickstart

Watching files in a directory is as simple as instantiating a watcher and handling  
events emitted when files get created, changed, or deleted.

```javascript
Var Watcher = require('watchfs').Watcher;

var watcher = new Watcher({
    paths: [ 'path-to-my-dir', 'path-to-my-file', 'etc' ],
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

## options

The following options can be specified when creating a Watcher object

### options.paths

This could be a string or an array containing paths to files or directories.  
Any directories specified will be watched recursively unless limited by filtering.  

```javascript
var watcher1 = new Watcher({
    paths: '/work/my-project'
});

var watcher2 = new Watcher({
    paths: [ '/work/my-other-project', '/work/my-file' ]
});
```

### options.filters

Filters can be used to limit which files or directories are being watched.  
`filters` should be an object containing two functions `includeDir` and `includeFile`.  
Both functions will be called when traversing the file system with the full path of each  
file or directory encountered.  

The example below will watch only the specified folder and will recurse only one folder below  

```javascript
var watcher = new Watcher({
    paths: '/work/my-project',
    filters: {
        includeDir: function(fullPath) {
            return /^\/work\/my-project(\/[^/]+)?$/.test(fullPath);
        }
    }
});
```

In the next example we're watching only js files and we're skipping .git and node_modules folders  

```javascript
var watcher = new Watcher({
    paths: '/work/my-project',
    filters: {
        includeDir: function(fullPath) {
            var skip = /(\.git)|(node_modules)/.test(fullPath);
            return !skip;
        },
        includeFile: function(fullPath) {
            return /\.js/.test(fullPath);
        }
    }
});
```

## Events

* `create` fired when a file is created
* `change` fired when a file is changed
* `delete` fired when a file is deleted
* `any` fires when any of the above events fire

```javascript
watcher.on('create', function(name) {
    console.log('file ' + name + ' created');
});

watcher.on('any', function(name, type) {
    console.log('file ' + name + ' ' + type + 'd');
});
```

NOTES: 
* Not tested on Windows
* Internally it uses fs.watch which could throw an EMFILE error when watching too many files. In those cases ulimit needs to be increased. Use the [posix](https://github.com/melor/node-posix) module to increase the ulimit from within a node js process.
