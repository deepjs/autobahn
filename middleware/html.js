/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */
var deep = require("deepjs");
require("deep-routes");
require("deep-jquery");
var urlparse = require('url').parse;
var cheerio = require('cheerio');
exports.simpleMap = function(map){

	var closure = {};

	var usableMap = [];
	var d = deep.createRouteMap(map)
	.done(function(map){
		closure.map = map;
	})
	.logError();

	deep.jquery.addDomProtocols();
	return function (request, response, next)
	{
		//console.log("html mappers : ", request.url , " - ", request.headers);
		//if(!request.is("text/html"))
		//	return next();
		var $ = deep.context.$ = cheerio.load('<!doctype html><html><head></head><body></body></html>');
		deep.jquery.init(deep.context.$);

		deep.when(closure.map.route(request.url))
		.always(function(){
			response.writeHead(200, {'Content-Type': 'text/html'});
			response.end($.html());
		})
		//console.log("res : ", res)

		/*
			.done(function(success){
				//console.log("success map loaded : ", pathname, success);
				if(success.context.content && success.context.content.join)
					success.context.content = success.context.content.join("\n");
				res.writeHead(200, {'Content-Type': 'text/html', "Location":pathname});
				res.end(success.page(success.context));
			})
			.fail(function(error){
				if(deep.debug)
					deep.utils.dumpError(error);
				res.writeHead(error.status || 500, {'Content-Type': 'application/json', "Location":pathname});
				res.end(JSON.stringify(error));
			});
		}
		else
			next();*/
	};
};

/*
    deep.generalModes("roles","public");

    var exampleMap = {
        topbar:deep.View({
            route:"!/[login,register]",
            how:"swig::/test.swig",
            where:"dom.htmlOf::#topbar"
        }),
        footer:deep.ocm({
            user:deep.View({
                route:"!/register",
                how:"<span>ocm powaaaaaaa user</span>",
                where:deep.jquery.htmlOf("#footer")
            }),
            "public":{
                backgrounds:["this::../user"],
                how:"<span>ocm powaaaaaaa public</span>"
            }
        }, { group:"roles" }),
        campaign:deep.View({
            route:"/campaign/s:id",
            how:"<div>hello campaign { id }<div id='info'></div><div id='update'></div></div>",
            where:"dom.htmlOf::#content",
            subs:{
                info:deep.View({
                    route:"?./info/s:id",
                    how:"swig::/info.swig",
                    where:"dom.htmlOf::#info"
                }),
                update:deep.View({
                    route:"./update/s:id",
                    how:"<div>update hello { id }<div id='profile'></div></div>",
                    where:"dom.htmlOf::#update",
                    subs:{
                        profile:deep.View({
                            how:"<div>profile from update { parent.id }</div>",
                            where:"dom.htmlOf::#profile"
                        })
                    }
                })
            }
        }),
        register:deep.View({
            route:"/register",
            how:"<div>register</div>",
            where:"dom.htmlOf::#content"
        }),
        campaigns:deep.View({
            route:"/campaigns/?q:query/?(i:start/i:end)",
            how:"<div>campaigns { query | 'no query' } - { start | '0' }:{ end | '10'}<div id='info'></div></div>",
            where:"dom.htmlOf::#content",
            subs:{
              info:deep.View({
                route:"?./info/s:id",
                how:"swig::/info.swig",
                where:"dom.htmlOf::#info"
              })
            }
        })
    };


*/






