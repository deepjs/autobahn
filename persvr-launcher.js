/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if(typeof define !== 'function'){
	var define = require('amdefine')(module);
}

define(function(require){
//______________________________________________________________________
// catch settings from command line
var settings = require("perstore/util/settings");

var settingsMode = {};
if(settings.mode)
{
	settingsMode = settings.mode;
	delete settings.mode;
}

if(argv.mode && settingsMode[argv.mode])
	settings.currentMode = argv.mode;
else if(settings.defaultMode && settingsMode[settings.defaultMode])
	settings.currentMode = settings.defaultMode;
else
	settings.currentMode = "dev";

if(settings.currentMode && settingsMode[settings.currentMode])
	deepCopy(settingsMode[argv.mode], settings, true);


//_______________________________


var routes = require("pintura/jsgi/routes");
var fs = require('fs');
var crypto = require('crypto');
var md5 =  crypto.createHash("md5");
var swig  = require('swig');
var modelTools = require("perstore/model");

var admins = settings.security.admins,
	copy = require("perstore/util/copy").copy,
	Restrictive = require("perstore/facet").Restrictive,
	Permissive = require("perstore/facet").Permissive,
	FileSystem = require("perstore/store/filesystem").FileSystem, 
	File = require("pintura/media").getFileModel(),
	Model = require("perstore/model").Model,
	Notifying = require("perstore/store/notifying").Notifying,
	Static = require("pintura/jsgi/static").Static,
	User = config.security.getAuthenticationFacet();

var ClassModel = Model(Notifying(require("perstore/stores").DefaultStore()),{});

//________________________________________________
// configure 

var roles = {
}
var statics = [];
var userModel = null;

var config = require("pintura/pintura").config = {
	mediaSelector: require("pintura/media").Media.optimumMedia,
	database: require("perstore/stores"),
	security: require("pintura/security").DefaultSecurity(),
	responseCache: require("perstore/store/memory").Memory({path: "response"}), //require("perstore/store/filesystem").FileSystem("response", {defaultExtension: "cache",dataFolder: "cache" }),
	serverName: "Pintura",
	customRoutes: [],
	getDataModel:function(request){
		var user = request.remoteUser;
		if(user){

			if(request.remoteUserRoles && roles[request.remoteUserRoles[0]]){
				return roles.admin.facets; // admin users can directly access the data model without facets
			}else if(roles.user)
				return roles.user.facets;
		}
		return roles["public"].["data-model"];
	}
};

function launch(){
	if(argv.settings)
		deepCopy(argv.settings, settings, true);
	modelTools.initializeRoot(roles.full.facets || {});
	if(autobahn.ressource && autobahn.ressource.User)
	{
		var rolesName = [];
		for(var i in roles){
			if(!roles.hasOwnProperty(i))
				continue;
			rolesName.push(i);
		}
		autobahn.ressource.User.schema.roles = {
			type:"array",
			minLength:0,
			required:false,
			items:{
				type:"string",
				enum:rolesName
			}
		}
		if(autobahn.ressource.User.store)
			userModel = Model(autobahn.ressource.User.store,autobahn.ressource.User.schema);
		else
			userModel = Model(autobahn.ressource.User.schema)
		userModel.setPath("User");
		config.security.setUserModel( userModel );
	}	
	var pinturaApp = require("pintura/pintura").app(null, config);
	var cascade = statics.concat(pinturaApp);
	require("pintura/start-node").start(
		// uncomment this to enable compression with node-compress
		//require("pintura/jsgi/compress").Compress(	
			//require("./app/server/jsgi/language-jsgi").LanguageJSGI(
				//require("./app/server/jsgi/redirect-root").RedirectRoot(
					require("pintura/jsgi/cascade").Cascade( cascade
						/*[ 
					// cascade from static to pintura REST handling
						Static({urls:["/www/common/js-lib/leaf"], root: "node_modules/leaf", directoryListing: true}),
						Static({urls:["/www/common/js-lib/compose"], root: "node_modules/compose", directoryListing: true}),
						Static({urls:["/www/common/js-lib/rql"], root: "node_modules/rql", directoryListing: true}),
						Static({urls:["/www/common/js-lib/promised-io"], root: "node_modules/promised-io", directoryListing: true}),
						Static({urls:["/www/common/js-custom/shared"], root: "app/shared", directoryListing: true}),
						Static({urls:["/www"], root: "www", directoryListing: true, index:"index.html"}),		
						// this will provide access to the server side JS libraries from the client

						pinturaApp
						
					]*/	)
				//)
			//)
		//)
	);
}


	function addRole(name, roleController){
		roles[name] = roleController;
	}

	function createUser(id, password){

	}

	function addStatics(roleName, staticsArray){
		staticsArray.forEach(function(e){
			statics.push(Static(e));
		})
	}
	return { config:config, launch:launch }

});