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

define(function (require){
	var deep = require("deep/deep");
	var when = deep.when;
	var RoleController = require("autobahn/role-controller");
	var FacetController = require("autobahn/facet-controller");
	var Session = require("autobahn/session");
	var statics = require("autobahn/jsgi/autobahn-statics-jsgi").AutobahnStaticsJSGI;
	var errors = require("autobahn/errors");
	var dicoCompiled = {};

	var AutobahnController = function(){}


	AutobahnController.prototype = {

		facets:{
			get:function (id, options) {
				if(!this.store)
					throw new AccessError(this.name + " don't have store to get something");
				var othis = this;
				return when(this.store.get(id, options)).then( function(obj){
					if(!obj)
						return obj;
					if(obj.status && obj.status >= 400)
						return obj;
					return othis.filterProperties(obj, othis.schemas.get);
				},function(error){
					return error;// { __isErrorResponse__:true, status:400, body:"get failed on store" }
				}); 
			},	
			ownerget:function(schema){
				return deep.compose.around(function(old){
					return function (id, options) {
						if(!options.session)
							throw new AccessError("error : sorry, there is no way to catch if your the owner of this object. please login.");
						var self = this;
						return deep.when(old.apply(this, [id, options])).then(function (obj) {
							if(self.onwerId(instance) != options.session.remoteUser.id)
								throw new AccessError("error : sorry, you are not the owner of this object");
							return obj;
						});
					}
				});
			},
			schema:deep.compose.around(function (argument) {
				// body...
			}),
			forbidden:function (argument) {
				throw new AccessError(this.uri+ " : you don't have right to access this service");
			},
			post:function (argument) {
				// body...
			},
			put:function (argument) {
				// body...
			},
			"delete":function (argument) {
				// body...
			}
		},
		
		getFile : function(path, roles)
		{
			roles = roles || ["public"];
			try{
				return deep.when(self.compileRoles(roles))
				.done(function (ctrl) {
					var req ={
						pathInfo:path,
						headers:{},
					}
					ctrl.staticsController(req);
				})
			}
			catch(e)
			{
				return {
					status:500,
					headers:{},
					body:["error while gettings file : "+path, e]
				}
			}
	
			return statics.getFile(path);
		},
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
			var session = request.session;
			var roles = ["public"];
			if(session && session.remoteUser)
			{
				roles = session.remoteUser.roles || ["user"];
				if(console.flags["autobahn"])
					console.log("autobahn", "getRole() : request.remoteUser.login : ", session.remoteUser.login);
			}	
			if(console.flags["autobahn"])
				console.log("autobahn", "getRole() : will compil roles : ", roles);
			return deep.when(this.compileRoles(roles))
			.done(function (ctrl) {
				request.roleController = ctrl;
			});
		},
		analyseRequest : function(request)
		{

			var path = request.pathInfo.substring(1);
			var method = request.method.toLowerCase();
			var scriptName = request.scriptName;
			var headers = request.headers;
			
			var ctrl = null;
			var part, slashIndex = path.indexOf("/");
			if(slashIndex > -1){
				part = path.substring(0, slashIndex);
				path = path.substring(slashIndex + 1);
				scriptName += '/' + part;
				//console.log("chope part : ", part, {mod:facet})
			}

			var infos = {
				request:request,
				responseHeaders:{},
				scriptName:scriptName,
				path:path,
				part:part,
				session:null,
				query:null,
				method:method
			};

		//	console.log("Autobahn controller : analyseRequest  : ", JSON.stringify(infos));

			for(var i in headers)// for now just copy all of them, probably should do certain ones though
				infos.responseHeaders[i] = headers[i];
			delete infos.responseHeaders["user-agent"];
			delete infos.responseHeaders["content-type"];
	
			return deep.when(this.getRequestController(request))
			.done(function(ctrl){
				// console.log("role compiled : ", ctrl)
				//	console.log("role compiled : login : ", ctrl.facets.login.post)
				try{
					return deep.when(ctrl.analyse(request, infos))
					.done(function (result) {
						return result;
					})
					.fail(function  (error) {
						if(!error ||  !error.status)
							return { status:404, headers:infos.responseHeaders, body:["error : ", JSON.stringify(error)]};
						return error;
					});
				}
				catch(e){
					return { status:404, headers:{}, body:["error when analyses request : ",JSON.stringify(e)]};
				}
			})
			.fail(function (error) {
				if(!error ||  !error.status)
					return { status:404, headers:infos.responseHeaders, body:["error : ", JSON.stringify(error)]};
				return error;
			});
		},
		compileRoles : function(roles)
		{
			var othis = this;
			
			try{
				var joined = roles.join(".");
				var ctrl = this.roles[joined];
				if(!ctrl)
				{
					if(console.flags["autobahn"])
						console.log("roles (",roles,") wasn't in cache : get it : ", this)
					var ctrl = {};
					roles.forEach(function(e){
						//console.log("applying role : ", e)
						if(othis.roles[e])
							deep.utils.up(othis.roles[e], ctrl);
						else
							throw new Error({msg:"error while compiling roles : no role founded with : "+e, error:null});
					});
					this.roles[joined] = ctrl;

					
				}
			}catch(e){
				if(e instanceof Error)
					throw e;
				throw new Error({msg:"error while compiling roles", error:e});
			}
			

			if(!ctrl.loaded)
			{
				var d = deep(ctrl)
				.bottom(new RoleController())
				.query("./facets/*")
				.bottom(new FacetController())
				.root()
				.flatten()
				.run(function () {
					return deep(othis)
					.query("/roles/"+joined+"/facets/*/store")
					.load();
				})
				.run("init")
				.query("/facets/*")
				.run("init")
				.log("role flattened : "+joined);

				return deep.when(d)
				.done(function (success) {
					return ctrl;
				})
				.fail(function (argument) {
					throw new Error({msg:"error while compiling roles", error:e});
				})
			}

			return ctrl;
			//return ctrl;
		}
	}
	
	var autobahnCtrl = new AutobahnController();
	deep.request.autobahn = autobahnCtrl;
	return autobahnCtrl;
})

