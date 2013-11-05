/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */
 
if(typeof define !== 'function')
	var define = require('amdefine')(module);


define(["require", "deepjs/deep"], function restfulMapperDefine(require, deep){
	var router = require("deep-routes/route");
	var urlparse = require('url').parse;
	var mapper = {
		map:function(obj){
			var usableMap = [];
			for(var i in obj)
			{
				var r = router.createRouter(i, false);
				usableMap.push({
					router:r,
					store:obj[i]
				});
			}
			return function(request, response, next)
			{
				var parsedURL = urlparse(request.url);
				var pathname = parsedURL.pathname;
				var headers = request.headers;
				//console.log("restful map : parsed url : ", parsedURL);
				//console.log("restful map : method : ", request.method);
				//console.log("restful map : headers : ", request.headers);
				var handler = {};
				var handled = usableMap.some(function (entry) {
					handler.params = entry.router.match(pathname);
					if(handler.params)
					{
						handler.store = entry.store;
						return true;
					}
					return false;
				});

				if(handled)
				{
					//console.log("restful map : handled : params : ", handler.params);
					//console.log("restful map : request.body : ", request.body);
					var d = null;
					if(handler.store._deep_ocm_)
						handler.store = handler.store();
					switch(request.method.toLowerCase())
					{
						case "get" : // subcases : get, query, range
							if(!handler.store.get)
								return next();
							if(headers.range)
							{
								if(!handler.store.range)
									return next();
								var res = /items=(\d+)-(\d+)/gi.exec(headers.range);
								if(res)
								{
									var start = parseInt(res[1]);
									var end = parseInt(res[2]);
									d = deep(handler.store).range(start, end, parsedURL.search)
									.done(function(range){
										response.status((range.start === 0 && range.total -1 === end) ? 200 : 206);
										response.set({
											'Content-Type': 'application/json',
											'Content-Range':  "items " + range.start + '-' + range.end + '/' + (range.total || '*')
										});
										return range.results;
									});
								}
								else
									d = deep.when(deep.errors.NotFound("range misformed"));
								//var start = 
							}
							else
								d = deep(handler.store).get(handler.params.id || parsedURL.search);
							break;

						case "post" : // subcases : post, rpc, bulk
							if(!handler.store.post)
								return next();
							d = deep(handler.store).post(request.body);
							break;

						case "put" :
							if(!handler.store.put)
								return next();
							d = deep(handler.store).put(request.body);
							break;

						case "patch" :
							if(!handler.store.patch)
								return next();
							d = deep(handler.store).patch(request.body);
							break;

						case "delete" :
							if(!handler.store.del)
								return next();
							d = deep(handler.store).del(request.body);
							break;

						default :
					}
					d.done(function(s){
						if(!response.get('Content-Range'))
							response.writeHead(200, {'Content-Type': 'application/json'});
						response.end(JSON.stringify(s, null, ' '));
					})
					.fail(function(){
						next();
					});
				}
				else
					next();
			};
		}
	};
	return mapper;
});