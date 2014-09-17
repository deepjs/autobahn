/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * HTML views middleware for expressjs/autobahnjs/deepjs
 */

/**
 * Map example : 
 * var map = {
	head:deep.View({
		how:"<title>html from server</title>",
		where:"dom.appendTo::head"
	}),
	body:deep.View({
		how:"<div><div id='topbar'></div><div id='content'></div></div>",
		where:"dom.htmlOf::body",
		subs:{
			topbar:deep.View({
				how:"<div>topbar</div>",
				where:"dom.htmlOf::#topbar"
			}),
			content:deep.View({
				route:"/$",
				how:"<div>content</div>",
				where:"dom.htmlOf::#content"
			}),
			hello:deep.View({
				route:"/hello/?s:name",
				how:"<div>hello { name+'!' | 'dude!'}</div>",
				where:"dom.htmlOf::#content"
			})
		}
	})
};
 */

var deep = require("deepjs"),
    urlparse = require('url').parse,
    cheerio = require('cheerio');
require("deep-routes");
require("deep-jquery/lib/dom")("dom");



exports.map = function(map, config) {
    var closure = {};
    config = config || {};
    if (typeof config.allowRoot === 'undefined')
        config.allowRoot = true;
    var d = deep.createRouteMap(map)
        .done(function(map) {
            closure.map = map;
        })
        .elog();
    return function(request, response, next) {
        //console.log("html mappers : ", request.url , " - ", request.headers);
        if (!request.accepts("html"))
            return next();
        var match = closure.map.match(request.url);
        //console.log("html match : ", match);
        if (match.route.length === 0) {
            if (!config.allowRoot)
                return next();
        } else if (match.endChilds === 0 || match.endChilds !== match.route.length)
            return next();

        deep.Promise.context.concurrency = true;

        var $ = deep.Promise.context.$ = cheerio.load('<!doctype html><html><head></head><body></body></html>');
        deep.when(deep.RouteNode.refresh(match))
            .done(function(s) {
                response.writeHead(200, {
                    'Content-Type': 'text/html'
                });
                response.end($.html());
            })
            .fail(function(e) {
                response.writeHead(e.status || 500, {
                    'Content-Type': 'application/json'
                });
                response.end(JSON.stringify(e));
            });
    };
};