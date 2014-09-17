/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * Statics file server middleware for autbahnjs. (based on send mecanism)
 * TODO : map interpretation : if entry is array : loop on it, else, direct descriptor
 **/
var deep = require("deepjs"),
	router = require("deep-routes/lib/flat"),
	urlparse = require('url').parse,
	parseurl = require('parseurl'),
	escapeHtml = require('escape-html'),
	send = require('send'),
	url = require('url');

function produceMapper(map)
{
	var routes = [];
	Object.keys(map).forEach(function(i){
		var entries = map[i];
		var handler = {
			path:i,
			middlewares:[]
		};
		routes.push(handler);
		entries.forEach(function(entry){
			handler.middlewares.push(CreateManager(entry.path, i, entry.options));
		});
	});
	return function(req, res, next)
	{
		var firstURL = req.url;
		var pathname = urlparse(req.url).pathname;
		var middlewares = [];
		routes.forEach(function (entry) {
			//console.log("statics ananlyse : ", pathname, entry.path);
			if(pathname.match(new RegExp("^("+entry.path+")")))
				middlewares = middlewares.concat(entry.middlewares);
		});
		var context = deep.Promise.context;
		var hackedNext = function(){
			deep.Promise.context = context;
			if(middlewares.length === 0)
				return next();
			var follow = middlewares.shift();
			return follow(req, res, hackedNext);
		};
		hackedNext();
	};
}

exports.middleware = function(map){
	var closure = {
		cache:null
	};
	var getMap = function (){
		if(map._deep_ocm_)
		{
			closure.cache = closure.cache || {};
			if(deep.Promise.context.modes && deep.Promise.context.modes.roles)
			{
				var joined = deep.Promise.context.modes.roles;
				if(joined.join)
					joined.join(".");
				if(closure.cache[joined])
					return closure.cache[joined];
				closure.cache[joined] = produceMapper(map(),{});
				return closure.cache[joined];
			}
			else
				return deep.errors.OCM("Statics map is OCM but no roles found. aborting.");
		}
		else if(closure.cache)
			return closure.cache;
		closure.cache = produceMapper(map, {});
		return closure.cache;
	};
	if(map._deep_ocm_)
		deep.flatten(map);
	return function (req, res, next)
	{
		var m = getMap();
		if(m instanceof Error)
		{
			if(m.status == 404)
				return next();
			deep.utils.dumpError(m);
			res.writeHead(m.status || 500, {'Content-Type': 'application/json'});
			res.end(JSON.stringify(m));
		}
		else
			m(req, res, next);
	};
};

/*!
 * Connect - static
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * MIT Licensed
 */

/**
 * Module dependencies.
 */


/**
 * Static:
 *
 *   Static file server with the given `root` path.
 *
 * Examples:
 *
 *     var oneDay = 86400000;
 *
 *     connect()
 *       .use(connect.static(__dirname + '/public'))
 *
 *     connect()
 *       .use(connect.static(__dirname + '/public', { maxAge: oneDay }))
 *
 * Options:
 *
 *    - `maxAge`     Browser cache maxAge in milliseconds. defaults to 0
 *    - `hidden`     Allow transfer of hidden files. defaults to false
 *    - `redirect`   Redirect to trailing "/" when the pathname is a dir. defaults to true
 *    - `index`      Default file name, defaults to 'index.html'
 *
 * @param {String} root
 * @param {Object} options
 * @return {Function}
 * @api public
 */

function CreateManager(root, fakePath, options){
  options = options || {};

  // root required
  if (!root) throw new Error('static() root path required');

  // default redirect
  var redirect = false !== options.redirect;

  return function staticMiddleware(req, res, next) {
    if ('GET' != req.method && 'HEAD' != req.method) return next();
    var path = parseurl(req).pathname;
    //var pause = utils.pause(req);

    if(path.length > fakePath.length)
		path = path.substring(fakePath.length);

    function resume() {
      next();
     // pause.resume();
    }

    function directory() {
      if (!redirect) return resume();
      var originalUrl = url.parse(req.originalUrl);
      var target;
      originalUrl.pathname += '/';
      target = url.format(originalUrl);
      res.statusCode = 303;
      res.setHeader('Location', target);
      res.end('Redirecting to ' + escapeHtml(target));
    }

    function error(err) {
      if (404 == err.status) return resume();
      next(err);
    }

    send(req, path)
      .maxage(options.maxAge || 0)
      .root(root)
      .index(options.index || 'index.html')
      .hidden(options.hidden)
      .on('error', error)
      .on('directory', directory)
      .pipe(res);
  };
}

/**
 * Expose mime module.
 *
 * If you wish to extend the mime table use this
 * reference to the "mime" module in the npm registry.
 */

exports.mime = send.mime;


