/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
/**
	Autobahn : 
	managing user roles, restful facets, statics files exposition and url routes (url mapped with leaf view-controller)

	All this in one layer..;)
*/

/*

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
	var deep = require("deepjs/deep");
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
			//console.log("autobahn will load : ", this);
			return deep(this)
			//.logValues()
			.log("autobahn flatten 1")
			.flatten()
			.log("______________________ autobahn flattened")
			.query("/stores/*")
			.run("init")
			.log("autobahn loaded");
		},
		getRequestController: function(request)
		{
			var session = request.autobahn.session;
			var roles = ["public"];
			if(session && session.passport)
			{
				roles = session.passport.roles || ["user"];
				if(console.flags["autobahn"])
					console.log("autobahn", "getRole() : request.passport : ", session.passport);
			}	
			if(console.flags["autobahn"])
				console.log("autobahn", "getRequestController() : will compil roles : ", roles, this);
			return deep.when(this.compileRoles(roles))
			.done(function (ctrl) {
				//console.log("getRequestController : role compiled : ", ctrl)
				request.autobahn.roleController = ctrl;
				if(request.autobahn.session)
						request.autobahn.session.roleController = function(){ return ctrl };
			});
		},
		analyseRequest : function(request)
		{
			//console.log("Autobahn-Controller.analyse")
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
						if(result && result._pintura_redirection_)
							return result;
						if(!(result instanceof AutobahnResponse) )
							return new AutobahnResponse(200, request.autobahn.response.headers, result);
						return result;
					})
					.fail(function  (error) 
					{
						//console.log("error in autobah controller analyse : ", error);
						if(error instanceof Error)
							return error;
						return new errors.Server(error, error.status || 404);
					});
				}
				catch(e){
					if(e instanceof Error)
						return e;
					return new errors.Server(e, 500);
				}
			})
			.fail(function (error) {
				//console.log("autobahn-controller : request error : ", error);
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
					if(console.flags["autobahn-roles-cache"])
						console.log("roles (",roles,") wasn't in cache : create it");
					var ctrl = {};
					roles.forEach(function(e){
						//console.log("applying role : ", e)
						if(othis.roles[e])
							deep.utils.up(othis.roles[e], ctrl);
						else
							throw new Error("error while compiling roles : no role founded with : "+e);
					});
					this.roles["_"+joined] = ctrl;
				}
			}
			catch(e)
			{
				if(e instanceof Error)
					return e;
				return new Error("error while compiling roles : "+String(e));
			}

			if(!ctrl.loaded)
			{
				//console.log("CONTROLLER NOT LOADED : load it : ", ctrl)
				ctrl.name = joined;
				return deep(this)
				.catchError()
				.query("./roles/_"+joined)
				//.log("__________________ ROLES JOINED CATCHED TO INIT ")
				.bottom(RoleController)
				//.logValues()
				.run("init")
				.log("role "+joined+" : flattened...")
				.done(function (success) {
					//console.log("success of role compilation : ", success)
					return ctrl;
				})
				.fail(function (error) {
					console.log("error while compiling roles : ", error);
				});
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

