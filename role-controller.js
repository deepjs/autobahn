//role-controller
/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
 /**
  * refactpring :
  * 	rename roles.xxx.facets by roles.xxx.stores (as in deep)
  * 	
 */
if(typeof define !== 'function'){
	var define = require('amdefine')(module);
}

define(function RoleControllerDefine(require)
{
	var deep = require("deep/deep");
	var errors = require("autobahn/errors")
	var FacetController = require("autobahn/facet-controller").Permissive;
	//var RouteNode = require("autobahn/route-node-controller");
	var AutobahnResponse = require("autobahn/autobahn-response")
	var Cascade = require("pintura/jsgi/cascade").Cascade;
	var	Static = require("pintura/jsgi/static").Static;
	var RoleController = {
		
		init:function () 
		{
			console.log( "Role Controller init : ", this.name);
			this.loaded = true;
			/*********************************************
			*  init statics cascade jsgi
			**********************************************/
			var stats = [];
			if(this.statics)
				this.statics.forEach(function (stat) {
					stats.push(Static(stat));
				});
			if(stats.length > 0)
				this.statics = Cascade(stats);
			else
				this.statics = null;
			/*********************************************
			*  INIT FACETS
			**********************************************/

			for(var i in this.facets)
			{
				this.facets[i].name = i;
				//console.log("Role Give name to facet : ", this.facets[i].name)
			}

			return deep(this)
			.position("role")
			.query("./facets/*")
			.bottom(FacetController)
			.back("role")
			.flatten()
			//.log("Facets flattened________________________________")
			.query("./facets/*")
			.branches(function (brancher)
			{
				console.log("facet will init stores")
				brancher
				.branch()
				.query("./store?_schema.type=object")
				.run("init");

				brancher
				.branch()
				.query("./store?_schema.type=string")
				.load();
				//console.log("stores init launched")
				return brancher;
			})
			//.log("________________ stores initialised")
			.run("init")
			.fail(function (error) {
				// body...
				 console.log("error while compiling role controller")
			})
			.log("role ("+this.name+") : facets initialised _______________________");
		},
		analyse : function(request)
		{
			console.log("role "+this.name+" analyse ( "+request.method+" ) : ", request.url);
			var self = this;
			//console.log("RoleController.analyse : statics : ", c);
			//console.log("RoleController.analyse : facets : ", this);

			var noStatics = function (error) {
				console.log("RoleController : statics error (",error,") : try next")
				if(self.facets && self.facets[request.autobahn.part]) 
				{
					console.log("try facet : ", request.autobahn.part)
					var facet = self.facets[request.autobahn.part];
					return deep.when(request.body)
					.done(function(){
						return facet.analyse(request);
					})
					.done(function (success) 
					{
						//console.log("RoleController  "+self.name+"  : facets ("+facet.name+"."+request.autobahn.method+") success : ", success);
						if(typeof success === 'undefined' || success == null)
							return new errors.NotFound("facet failed to retrieve something")
						if(success instanceof AutobahnResponse)
							return success;
						if(success.status)
							return new AutobahnResponse(success.status, success.headers, success.body || "facet return nothing");
					})
					.fail(function (error) {
						console.log("RoleController  "+self.name+"  : facets ("+facet.name+"."+request.autobahn.method+") error : ", error);
						return error;
					});
				}
				else if(self.routes)
					return self.routes.analyse(request);
				
				if(console.flags["log-facet-404"])
					console.log("autobahn ( "+self.name+" ) has nothing to do with request : ", request.url);
				return new errors.NotFound("autobahn ( "+self.name+" ) has nothing to do with request : "+ request.url);
			}

			if(this.statics)
			{
			console.log("facet  have statics")

				return deep.when(this.statics(request))
				.fail(function (error) {
					console.log("statics failed : ", error);
					return noStatics(error);
				})
				.done(function (success) {
					//console.log("RoleController ( "+self.name+" ) : statics success : ", success);
					if(!success || success.status >= 400)
						return noStatics(success);
					return success;
				});
			}
			console.log("facet dont have statics")
			return noStatics(null);
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