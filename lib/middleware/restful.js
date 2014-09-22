/**
* @author Gilles Coomans <gilles.coomans@gmail.com>
* Expressjs/autobahnjs restful router middleware.
*/

var deep = require("deepjs");
require("deep-routes/lib/flat"); // route DSL parser
require("deep-restful/lib/chain"); // deepjs homogeneous restful chain API

var mapper = {
	map:function(obj, serviceRouteType){
		// console.log("restful map : ", obj)
		var mapper = deep.flatRoutes(obj, true);
		return function(request, response, next)
		{
			deep.when(mapper)
			.done(function(mapper){
				var headers = request.headers;
				//console.log("restful : session : ", request.session);
				//console.log("restful map : method : ", request.method);
				//console.log("restful map : headers : ", request.headers);
				var handler = mapper.match(request.url);
				if(handler)
				{
					//console.log("restful map : handled : params : ", handler.params);
					//console.log("restful map : request.body : ", request.body);
					//console.log("restful : context modes : ", deep.Promise.context.modes);
					var store = handler.entry;
					if(typeof store === 'function')
						store = {
							get:store
						};
					var options = {
						params:handler.params
					};
					var id = null;
					if(handler.standard)
					{
						if(handler.params.id)
						{
							id = handler.params.id;
							if(handler.params.path && handler.params.path !== '/')
								id += handler.params.path;
						}
						else if(handler.params.query)
							id = handler.params.query;
					}
					else 
						id = handler.params;
					if(id && typeof id !== 'object')
						options.id = id;

					var d = null;
					switch(request.method.toLowerCase())
					{
						case "head" :
							d = deep.restful(store)
							.head(id, options);
							break;
						case "get" : // subcases : get, query, range
							//console.log("will get : ", handler.params);
							if(!id && !options.id)
								options.id = id = "?";

							if(headers.range)
							{
								if(!store.range)
									d = deep.when(deep.errors.Range("range unmanaged by related store"));
								else
								{
									var res = /items=(\d+)-(\d+)/gi.exec(headers.range);
									if(res)
									{
										var start = parseInt(res[1], 10);
										var end = parseInt(res[2], 10);
										d = deep.restful(store)
										.range(start, end, handler.params.query , options)
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
										d = deep.when(deep.errors.Range("range misformed"));
								}
							}
							else
								d = deep.restful(store).get(id, options);
							break;

						case "post" : // subcases : post, rpc, bulk
							if(request.is("application/json-rpc"))	// RPC
							{
								d = deep.restful(store)
								.rpc(request.body.method, request.body.params , handler.params.id, options)
								.done(function  (result) {
									// console.log("rpc call : response : ", result);
									return {
										id:request.body.id,
										error:null,
										result:result
									};
								})
								.fail(function (error) {
									//console.log("rpc failed : response : ", error);
									return {
										id:request.body.id,
										error:JSON.stringify(error),
										result:null
									};
								});
							}
							else if(request.is("message/*"))			// BULK
							{
								if(!(request.body instanceof Array))
									d =  deep.when(deep.errors.Bulk("trying to send message but body isn't array! ("+self.name+")"));
								else{
									var alls = [];
									request.body.forEach(function (message) {
										//console.log("BULK UPDATE : message : ", message);
										var h = null;
										var meth = message.method.toLowerCase();
										var opt = deep.abottom(options, {id:message.to});
										if(deep.utils.inArray(meth, ["patch","put","post"]))
											h = deep.restful(store)[meth](message.body, opt);
										else
											h = deep.restful(store)[meth](message.to, opt);
										alls.push(h);
									});
									d = deep.all(alls)
									.done(function (results) {
										var res = [];
										request.body.forEach(function (message) {
											var r = results.shift();
											res.push({
												from:message.to,
												body:r,
												id:message.id,
												type:message.method
											});
										});
										return res;
									});
								}
							}
							else if(request.is("application/json"))  // POST
								d = deep.restful(store).post(request.body, options);
							else
								d = deep.when(deep.errors.Post("unrecognised content-type"));
							break;

						case "put" :
							if(!request.is("application/json"))
								d = deep.when(deep.errors.Put("unrecognised content-type"));
							d = deep.restful(store).put(request.body, options);
							break;

						case "patch" :
							// console.log("restful apply patch")
							if(!request.is("application/json"))
								d = deep.when(deep.errors.Patch("unrecognised content-type"));
							d = deep.restful(store).patch(request.body, options);
							break;

						case "delete" :
							if(!store.del)
								d = deep.when(deep.errors.MethodNotAllowed());
							else
								d = deep.restful(store).del(handler.params.id, options);
							break;

						default : // ASSUMING OPTIONS?
								d = deep.when(deep.errors.MethodNotAllowed());
					}
					d.done(function(s){
						if(s && s._deep_redirection_)
							response.redirect(s.to);
						else
						{
							//console.log(" restful result : ", s);
							if(!response.get('Content-Range'))
								response.writeHead(200, {'Content-Type': 'application/json'});
							response.end(JSON.stringify(s));
						}
					})
					.fail(function(e){
						deep.log("restful error : ", e.toString());
						response.writeHead(e.status || 400, {'Content-Type': 'text/html'});
						if(deep.context("debug"))
							response.end("error : "+ e.toString());
						else
							response.end("error");
					});
				}
				else
					next();
			})
			.fail(function(e){
				deep.log("restful map flatten error : ", e.toString());
				response.writeHead(e.status || 400, {'Content-Type': 'text/html'});
				if(deep.context("debug"))
					response.end("error : "+ e.toString());
				else
					response.end("error");
			});
		};
	}
};

module.exports = mapper;



