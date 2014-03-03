/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */

/**
 * Example : 
 * var htmls = {
	head:deep.View({
		how:"<title>html from server</title>",
		where:"dom.appendTo::head"
	}),
	body:deep.View({
		how:"<div>body<div id='topbar'></div><div id='content'></div></div>",
		where:"dom.htmlOf::body",
		subs:{
			topbar:deep.View({
				how:"<div>topbar</div>",
				where:"dom.htmlOf::#topbar"
			}),
			content:deep.View({
				how:"<div>content</div>",
				where:"dom.htmlOf::#content"
			})
		}
	})
};
 */

var deep = require("deepjs");
require("deep-routes");
require("deep-jquery");

var urlparse = require('url').parse,
	cheerio = require('cheerio');

deep.jquery.addDomProtocols();
exports.map = function(map, config){

	var closure = {};
	config = config || {};
	if(typeof config.allowRoot === 'undefined')
		config.allowRoot = true;

	var usableMap = [];
	var d = deep.createRouteMap(map)
	.done(function(map){
		closure.map = map;
	})
	.logError();

	return function (request, response, next)
	{
		//console.log("html mappers : ", request.url , " - ", request.headers);
		if(!request.accepts("html"))
			return next();
		var match = closure.map.match(request.url);
		//console.log("html match : ", match);
		if(match.route.length === 0)
		{
			if(!config.allowRoot)
				return next();
		}
		else if(match.endChilds === 0)
			return next();

		var $ = deep.context.$ = cheerio.load('<!doctype html><html><head></head><body></body></html>');
		deep.jquery.init($);
		deep.when(deep.RouteNode.refresh(match))
		.done(function(s){
			response.writeHead(200, {'Content-Type': 'text/html'});
			response.end($.html());
		})
		.fail(function(e){
			response.writeHead(error.status || 500, {'Content-Type': 'application/json'});
			response.end(JSON.stringify(e));
		});
	};
};





