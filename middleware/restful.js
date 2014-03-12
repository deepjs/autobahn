/**
* @author Gilles Coomans <gilles.coomans@gmail.com>
*/



var deep = require("deepjs");
var router = require("deep-routes/lib/flat");
require("deep-routes/lib/route");
var urlparse = require('url').parse;
var mapper = {
	map:function(obj, serviceRouteType){
		// console.log("restful map : ", obj)
		var usableMap = [];
		for(var i in obj)
		{
			// console.log("map restful : ",i, obj[i])
			var store = obj[i];
			//if(serviceRouteType !== 'deep')
			//	r = router.createRouter(i, false);
			var standard = false;
			if(i.indexOf(":") == -1)
			{
				standard = true;
				if(i[i.length-1]=='/')
					i += "?[(s:id/?p:path),q:query]";
				else
					i += "/?[(s:id/?p:path),q:query]";
			}
			var r = new deep.Route(i);
			usableMap.push({
				standard:standard,
				router:r,
				store:store
			});
			if(store._deep_ocm_)
				store.flatten();//.log("restful entry is ocm : flattened").log();
		}

		return function(request, response, next)
		{
			//console.log("restful : session : ", request.session);
			var headers = request.headers;
			//var parsed = deep.utils.parseURL(request.url);
			//console.log("restful map : parsed url : ", parsedURL);
			//console.log("restful map : parsed uri : ", parsed);
			//console.log("restful map : method : ", request.method);
			//console.log("restful map : headers : ", request.headers);
			
			// console.log("restfulCall : ", request.method)


			var handler = {};
			var handled = usableMap.some(function (entry) {
				handler.params = entry.router.match(request.url);
				if(handler.params)
				{
					handler.standard = entry.standard;
					handler.params = handler.params.output;
					handler.store = entry.store;
					return true;
				}
				return false;
			});

			if(handled)
			{
				//console.log("restful map : pathname : ", pathname);
				//console.log("restful map : handled : params : ", handler.params);
				//console.log("restful map : request.body : ", request.body);
				var d = null;
				//console.log("restful : store : ", handler.store);
				//console.log("restful : context : ", deep.context.modes);

				var store = handler.store;
				if(store._deep_ocm_)
					store = store();

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


				switch(request.method.toLowerCase())
				{
					case "head" :
						d = deep.store(store).head(id, options);
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
									d = deep.store(store).range(start, end, parsedURL.search , options)
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
							d = deep.store(store).get(id, options);
						break;

					case "post" : // subcases : post, rpc, bulk
						if(request.is("application/json-rpc"))	// RPC
						{
							if(!store.rpc)
								d = deep.when(deep.errors.MethodNotAllowed("rpc unmanaged by related store"));
							else
								d = deep.store(store).rpc(request.body.method, request.body.params , handler.params.id, options)
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
									var opt = deep.utils.bottom(options, {id:message.to});
									if(deep.utils.inArray(meth, ["patch","put","post"]))
										h = deep.store(store)[meth](message.body, opt);
									else
										h = deep.store(store)[meth](message.to, opt);
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
							var opt = deep.utils.bottom(options, {id:handler.params.id});
							if(!store.post)
								d = deep.when(deep.errors.MethodNotAllowed());
							else
								d = deep.store(store).post(request.body, opt);
						}
						else
							d = deep.when(deep.errors.Post("unrecognised content-type"));
						break;

					case "put" :
						var opt = deep.utils.bottom(options, {id:handler.params.id});
						if(!request.is("application/json"))
							d = deep.when(deep.errors.Put("unrecognised content-type"));
						else if(!store.put)
							d = deep.when(deep.errors.MethodNotAllowed());
						else
							d = deep.store(store).put(request.body, opt);
						break;

					case "patch" :
						// console.log("restful apply patch")
						var opt = deep.utils.bottom(options, {id:handler.params.id});
						if(!request.is("application/json"))
							d = deep.when(deep.errors.Patch("unrecognised content-type"));
						if(!store.patch)
							d = deep.when(deep.errors.MethodNotAllowed());
						else
							d = deep.store(store).patch(request.body, opt);
						break;

					case "delete" :
						if(!store.del)
							d = deep.when(deep.errors.MethodNotAllowed());
						else
							d = deep.store(store).del(handler.params.id, options);
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
					console.log("restful error : ", e.toString());
					response.writeHead(e.status || 400, {'Content-Type': 'text/html'});
					response.end("error : "+JSON.stringify(e));
				});
			}
			else
				next();
		};
	}
};

module.exports = mapper;



