//role-controller
/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if(typeof define !== 'function'){
	var define = require('amdefine')(module);
}

define(function RoleControllerDefine(require){
	var deep = require("deep/deep");
	//var RouteNode = require("autobahn/route-node-controller");
	var AutobahnResponse = require("autobahn/autobahn-response")
	var Cascade = require("pintura/jsgi/cascade").Cascade;
	var	Static = require("pintura/jsgi/static").Static;
	var RoleController = function (argument) {
		// body...
	}

	RoleController.prototype = {
		
		init:function () {
			this.loaded = true;
			var stats = [];
			if(this.statics)
				this.statics.forEach(function (stat) {
					stats.push(Static(stat));
				});
			this.statics = Cascade(stats);
		},
		getStatics:function (request, options) {
			return deep.when(this.statics(request));
		},
		analyse : function(request, options)
		{
			var self = this;
			var c = this.statics(request);
			//console.log("RoleController.analyse : statics : ", c);
			//console.log("RoleController.analyse : facets : ", this);

			var noStatics = function (error) {
				//console.log("RoleController : statics error : try next")
				if(self.facets && self.facets[options.part]) 
				{
					console.log("try facet : ", options.part)
					return deep(request.body)
					.catchError()
					.done(function(){
						return self.facets[options.part].analyse(request, options);
					})
					.done(function (success) {
						console.log("RoleController : facets success : ", success)
						//if(!success || success.status >= 400
						if(typeof success === 'undefined' || success == null)
							return new AutobahnResponse(404, {}, "facet failed to retrieve something")
						if(success instanceof AutobahnResponse)
							return success;
						if(success.status)
							return new AutobahnResponse(success.status, success.headers, success.body || success.message || "facet return nothing");
					})
					.fail(function (error) {
						console.log("RoleController : facets error : ", error)
						return error;
					});
				}
				else if(self.routes)
					return self.routes.analyse(request, options);
				
				console.log("autobahn has nothing to do with request");
				return new AutobahnResponse(404, {}, "autobahn has nothing to do with request : "+ request.url);
			}

			return deep.when(c)
			.fail(function (error) {
				return noStatics(error);
			})
			.done(function (success) {
				console.log("RoleController : statics success : ", success);
				if(!success || success.status >= 400)
					return noStatics(success);
				return success;
			});
			//return { status:404, headers:headers, body:["error 404 (RC)"]};
		},
		getFile : function(path, type)
		{
			//console.log("AutobahnStaticsJSGI : ", path)
			//var request = promiseModule.currentContext && promiseModule.currentContext.request;
			var req = {
				pathInfo:path,
				method:"GET",
				headers:{

				}
			}
			var def =  deep.Deferred();
			return deep.when(this.statics(req)).then(function(response){
				//console.log("AutobahnStaticsJSGI : ---------- response : ", response);
				if(!response || response.status >= 400)
				{
					def.reject(response);
					return;
				}
				//console.log("WILL WAIT BODY : ", response.body.toString())
				var resolved = response.body.toString()
				//console.log("AutobahnStaticsJSGI : body resolved: ", resolved)
			
				var p = null;
				try{
					switch(type)
					{
						case "json": 
							p = JSON.parse(resolved);
							break;
						case "html" : 
							p = resolved;
							break;
						default : throw new Error("bad file type ("+type+") in AutobahnStaticsJSGI for path : ", path)
					}	
				}
				catch(e){
					p = null;
				}
				if(p)
					resolved = p; 
				//	console.log("createHTTPRequestParser : "+method+" -  after parsing/resolving : body ? ", resolved)
				response.body = resolved;
				def.resolve(response.body);
			});
			return deep.promise(def);
		}
	}


	return RoleController;
});