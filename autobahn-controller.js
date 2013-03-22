/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
/**
	Autobahn : 
	managing user roles, restful facets, statics files exposition and url routes (url mapped with leaf view-controller)

	All this in one layer..;)
*/

/*
autobahn layer example : 
{

	settings:{			// will be deep-copy on local.json content
		
	},
	"statics":[
		{urls:["/www/common/js-lib/leaf"], root: "node_modules/leaf", directoryListing: true},
		{urls:["/www/common/js-lib/compose"], root: "node_modules/compose", directoryListing: true},
		{urls:["/www/common/js-lib/rql"], root: "node_modules/rql", directoryListing: true},
		{urls:["/www/common/js-lib/promised-io"], root: "node_modules/promised-io", directoryListing: true},
		{urls:["/www/common/js-custom/shared"], root: "app/shared", directoryListing: true},
		{urls:["/www"], root: "www", directoryListing: true, index:"index.html"}	
	],
	"ressource":{ // full
		Customer:{
			model:"model/fiche.js#/Fiche",
			negociations:{
				html:{
					templates:{
						root:{

						}
					}
				}
			}
		},
		User:{
			schema:{
				password:{ type:"string", required:true },
				
			}
		}
	},
	roles:{
		public:{
			route:pulicMap,
			facets:{
				Fiche:FicheFacet
			}
		},
		user:{
			backgrounds:["#../public"],
			facets:{
				Member:MemberFacet
			},
			routes:{
				profile:{
					"view-controller":{
						"backgrounds":["www/profile-layer.json"]
					}
				}
			}
		},
		admin:{
			backgrounds:["#../full"],
			route:{
				backgrounds:["#../public/urlmap"],
				roles:{
					admin:{
						controller:"controller/admin-controller.js"
					}
				}
			}
		}
	}
}

statics par roles : donner roles accepter par statics : un des roles c'est bon

garder cache des compilations de roles
empiler selon ordre dans autobahn

ce sont les facets qui vont être le plus dure à faire en couche

faire jsgi routes : sur base du Route-node-controller

Si user est traducteur et a un profile crowd founding :
user + traducteur + crowd founding
synthèse additive : du plus restreint au plus autorisé
*/

if(typeof define !== 'function'){
	var define = require('amdefine')(module);
}

define(function (require)
{
	var deep = require("deep/deep");
	var RoleController = require("autobahn/role-controller");
	var FacetController = require("autobahn/facet-controller").Permissive;
	var Accessors = require("autobahn/facet-controller").Accessors;
	var Session = require("autobahn/session");
	var statics = require("autobahn/jsgi/autobahn-statics-jsgi").AutobahnStaticsJSGI;
	var errors = require("autobahn/errors");
	var AutobahnResponse = require("autobahn/autobahn-response");
	var dicoCompiled = {};
	var utils = require("autobahn/utils");

	var AutobahnController = function(){}
	AutobahnController.prototype = {
		load : function (argument) 
		{
			if(this.loaded)
				return this;
			this.loaded = true;
			console.log("autobahn will load")

			return deep(this)
			//.log("autobahn flatten 1")
			.flatten()
			.query("/stores/*")
			.run("init")
			.log("autobahn loaded");
		},
		getRequestController: function(request)
		{
			var session = request.autobahn.session;
			var roles = ["public"];
			if(session && session.remoteUser)
			{

				roles = session.remoteUser.roles || ["user"];
				//if(console.flags["autobahn"])
					console.log("autobahn", "getRole() : request.remoteUser : ", session.remoteUser);
			}	
			if(console.flags["autobahn"])
				console.log("autobahn", "getRole() : will compil roles : ", roles, this);
			return deep.when(this.compileRoles(roles))
			.done(function (ctrl) {
				request.autobahn.roleController = ctrl;
				if(request.autobahn.session)
						request.autobahn.session.roleController = function(){ return ctrl };
			});
		},
		analyseRequest : function(request)
		{
			console.log("Autobahn-Controller.analyse")
			var ctrl = null;
			utils.parseRequestInfos(request);
			//console.log("Autobahn-Controller.analyse 2  ")


			return deep(this.getRequestController(request))
			.catchError(true)
			.done(function(ctrl){
				//console.log("role compiled : ", ctrl)
				//	console.log("role compiled : login : ", ctrl.facets.login.post)
				try{

					return deep.when(ctrl.analyse(request))
					.done(function (result) 
					{
						//console.log("result in autobahn controller : ", result)
						if(!(result instanceof AutobahnResponse) )
							return new AutobahnResponse(200, request.autobahn.response.headers, result);
						return result;
					})
					.fail(function  (error) 
					{
						if(error instanceof Error)
							return error;
						return new errors.Server(error, error.status || 404);
					});
				}
				catch(e){
					if(error instanceof Error)
						return error;
					return new errors.Server(e, 500);
				}
			})
			.fail(function (error) {
				if(error instanceof Error)
					return error;
				return new errors.Server(error, error.status || 404);
			});
		},
		compileRoles : function(roles)
		{
			var othis = this;
			
			try{
				var joined = roles.join(".");
				var ctrl = this.roles["_"+joined];
				if(!ctrl)
				{
					if(console.flags["autobahn"])
						console.log("roles (",roles,") wasn't in cache : get it")
					var ctrl = {};
					roles.forEach(function(e){
						console.log("applying role : ", e)
						if(othis.roles[e])
							deep.utils.up(othis.roles[e], ctrl);
						else
							throw new Error("error while compiling roles : no role founded with : "+e);
					});
					this.roles["_"+joined] = ctrl;
				}
			}catch(e){
				if(e instanceof Error)
					throw e;
				throw new Error("error while compiling roles");
			}
			

			if(!ctrl.loaded)
			{
				console.log("CONTROLLER NOT LOADED : load it : ", ctrl)
				ctrl.name = joined;
				var d = deep(othis)
				.query("./roles/_"+joined)
				.position("role")
				.bottom(new RoleController())
				.query("./facets/*")
				.bottom(FacetController)
				.back("role")
				.flatten()
				.query("./facets/*")
				.run(function () 
				{
					var d2 = deep(this)
					.query("./store?_schema.type=object")
					.run("init");
					var d = deep(this)
					.query("./store?_schema.type=string")
					.load();
					return deep.all([d, d2]);
				})
				.run("init")
				.back("role")
				.run("init")
				.log("role "+joined+"flattened : "+joined)
				
				return deep.when(d)
				.done(function (success) {
					return ctrl;
				})
				.fail(function (argument) {
					throw new Error("error while compiling roles");
				})
			}

			return ctrl;
			//return ctrl;
		}
	}
	
	var autobahnCtrl = new AutobahnController();
	//deep.request.autobahn = autobahnCtrl;
	//console.log("_____________________________________________ autobahnCtrl : ", autobahnCtrl)
	return autobahnCtrl;
})

