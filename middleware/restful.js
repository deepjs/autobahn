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
				console.log("restful : session : ", request.session);
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
							
							if(headers.range)
							{
								if(!handler.store.range)
									d = deep.when(deep.errors.Range("range unmanaged by related store"));
								else
								{
									var res = /items=(\d+)-(\d+)/gi.exec(headers.range);
									if(res)
									{
										var start = parseInt(res[1], 10);
										var end = parseInt(res[2], 10);
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
										d = deep.when(deep.errors.Range("range misformed"));
								}
							}
							else
								d = deep(handler.store).get(handler.params.id || parsedURL.search);
							break;

						case "post" : // subcases : post, rpc, bulk

							if(request.is("application/json-rpc"))	// RPC
							{
								if(!handler.store.rpc)
									d = deep.when(deep.errors.Rpc("rpc unmanaged by related store"));
								else
									d = deep(handler.store).rpc(request.body.method, request.body.params , handler.params.id)
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
										if(deep.utils.inArray(meth, ["patch","put","post"]))
											h = deep(handler.store)[meth](message.body, {id:message.to});
										else
											h = deep(handler.store)[meth](message.to, {id:message.to});
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
							{
								if(!handler.store.post)
									d = deep.when(deep.errors.Post("method not founded in related store"));
								else
									d = deep(handler.store).post(request.body, { id:handler.params.id });
							}
							else
								d = deep.when(deep.errors.Post("unrecognised content-type"));
							break;

						case "put" :
							if(!request.is("application/json"))
								d = deep.when(deep.errors.Put("unrecognised content-type"));
							else if(!handler.store.put)
								d = deep.when(deep.errors.Put("method not founded in related store"));
							else
								d = deep(handler.store).put(request.body, { id:handler.params.id });
							break;

						case "patch" :
							if(!request.is("application/json"))
								d = deep.when(deep.errors.Patch("unrecognised content-type"));
							if(!handler.store.patch)
								d = deep.when(deep.errors.Patch("method not founded in related store"));
							else
								d = deep(handler.store).patch(request.body, { id:handler.params.id });
							break;

						case "delete" :
							if(!handler.store.del)
								d = deep.when(deep.errors.Delete("method not founded in related store"));
							else
								d = deep(handler.store).del(handler.params.id);
							break;

						default : // ASSUMING OPTIONS?

					}
					d.done(function(s){
						if(!response.get('Content-Range'))
							response.writeHead(200, {'Content-Type': 'application/json'});
						response.end(JSON.stringify(s));
					})
					.fail(function(e){
						response.writeHead(e.status || 400, {'Content-Type': 'text/html'});
						response.end("error : "+JSON.stringify(e));
					});
				}
				else
					next();
			};
		}
	};
	return mapper;
});