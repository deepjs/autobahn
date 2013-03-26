//role-controller
/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if(typeof define !== 'function'){
	var define = require('amdefine')(module);
}

define(function RoleControllerDefine(require){
	var deep = require("deep/deep");
	var errors = require("autobahn/errors")
	//var RouteNode = require("autobahn/route-node-controller");
	var AutobahnResponse = require("autobahn/autobahn-response")
	var Cascade = require("pintura/jsgi/cascade").Cascade;
	var	Static = require("pintura/jsgi/static").Static;
	var RoleController = function (argument) {
		// body...
	}

	RoleController.prototype = {
		
		init:function () 
		{
			console.log("Role Controller init : ", this.name)
			this.loaded = true;
			var stats = [];
			if(this.statics)
				this.statics.forEach(function (stat) {
					stats.push(Static(stat));
				});
			this.statics = Cascade(stats);
			for(var i in this.facets)
			{
				this.facets[i].name = i;
				//console.log("Role Give name to facet : ", this.facets[i].name)
			}
		},
		getStatics:function (request) {
			return deep.when(this.statics(request));
		},
		analyse : function(request)
		{
			//console.log("role "+this.name+" analyse ( "+request.method+" ) : ", request.url);
			var self = this;
			//console.log("RoleController.analyse : statics : ", c);
			//console.log("RoleController.analyse : facets : ", this);

			var noStatics = function (error) {
				//console.log("RoleController : statics error : try next")
				if(self.facets && self.facets[request.autobahn.part]) 
				{
					//console.log("try facet : ", request.autobahn.part, self.facets[request.autobahn.part].analyse)
					return deep(request.body)
					.catchError(true)
					.done(function(){
						//console.log("role.try facet : ", request.autobahn.part);
						var res = self.facets[request.autobahn.part].analyse(request);
						//console.log("role.facet success : ",res);
						return res;
					})
					.done(function (success) {
						//
						 //console.log("RoleController  "+self.name+"  : facets success : ", success)
						//if(!success || success.status >= 400
						if(typeof success === 'undefined' || success == null)
							return new errors.NotFound("facet failed to retrieve something")
						if(success instanceof AutobahnResponse)
							return success;
						if(success.status)
							return new AutobahnResponse(success.status, success.headers, success.body || "facet return nothing");
					})
					.fail(function (error) {
						console.log("RoleController  "+self.name+"  : facets error : ", error)
						return error;
					});
				}
				else if(self.routes)
					return self.routes.analyse(request);
				
				console.log("autobahn ( "+self.name+" ) has nothing to do with request : ", request.url);
				return new errors.NotFound("autobahn ( "+self.name+" ) has nothing to do with request : "+ request.url);
			}

			if(this.statics)
				return deep(this.statics(request))
				.fail(function (error) {
					return noStatics(error);
				})
				.done(function (success) {
					// console.log("RoleController ( "+self.name+" ) : statics success : ", success);
					if(!success || success.status >= 400)
						return noStatics(success);
					return success;
				});
			return noStatics(null);
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