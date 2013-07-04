if(typeof define !== 'function'){
	var define = require('amdefine')(module);
}
/*
	request : 
		 passage par Session en jsgi : request contient session.
		arrivée dans autobahn controller : 
			analyse request : find roles

		put:stock.allowCreate().onwerput(),
		patch:stock.ownerpatch()

	autobahn().......close() : end chain
*/

define(["require","deep/deep"],function (require)
{
	var HTTPrequest = require("promised-io/http-client").request;
	var deep = require("deep/deep");
	var autobahnController = require("autobahn/autobahn-controller");
	var utils = require("autobahn/utils");
	var errors = require("autobahn/errors");
	deep.rethrow = false;
	var baseHandler = {
		session:function (session) 
		{
			var self = this;
			var func = function (s,e) 
			{
				self.currentSession = session;
				self.currentFacet = null;
				self.currentRole = null;
				var roles = session.remoteUser.roles || ["public"];
				if(session.roleController)
					return self.currentRole = session.roleController();
				return deep.when(autobahnController.compileRoles(roles)).then(function (ctrl) {
						self.currentRole = ctrl;
						if(!ctrl)
							throw new Error("No roles selected with : "+JSON.stringify(roles));
						return ctrl;
					});
			}
			deep.chain.addInChain.apply(self, [func]);
			return this;
		},
		roles:function (list) {
			var self = this;
			list = list || ["public"];
			var func = function (s,e) {
				return deep.when(autobahnController.compileRoles(list)).then(function (ctrl) {
					self.currentRole = ctrl;
					//self._entries = []
					if(!ctrl)
						throw new Error("No roles selected with : "+JSON.stringify(list));
				
					//self.running = false;
					return ctrl;
				})
			}
			deep.chain.addInChain.apply(self, [func]);
			return this;
		},
		facet:function (name) {
			var self = this;
			var func = function (s,e) {
				if(!self.currentRole)
					return deep.when(autobahnController.compileRoles(["public"])).then(function (ctrl) {
						self.currentRole = ctrl;
						if(!ctrl)
							throw new Error("No roles selected before facet use");
						//console.log("autobahn.facet :    roles  compiled  :  name : ",name, " - ctrl.facets ", ctrl.facets[name])
						self.currentFacet = ctrl.facets[name];
						if(!self.currentFacet)
							throw new Error("No facet selected with : "+name);
						return self.currentFacet;
					});
				else
				{
					self.currentFacet = self.currentRole.facets[name];
					//console.log("autobahn.facet : current roles already present : name : ",name, " - ctrl.facets ", self.currentRole.facets[name])
					if(!self.currentFacet)
						throw new Error("No facet selected with : "+name);
					return self.currentFacet;
				}
			}
			deep.utils.up(facetHandler, self);
			deep.chain.addInChain.apply(self, [func]);
			return this;
		}
	};
	var facetHandler = deep.utils.bottom(baseHandler, {
		rpc:function (id, method, args, options) {
			var self = this;
			var func = function (s,e) {
				if(!self.currentFacet)
					throw new Error("No facet selected before rpc : post on ",id);
				if(!self.currentFacet.rpc || !self.currentFacet.rpc[method])
					return new errors.MethodNotAllowed("rpc call couldn't be fullfilled : no metod found with : ", method)

				return deep.when(self.currentFacet.rpc[method](id, args))
				.then(function (result)
				{
					console.log("facetHandler : get : ", result)
					self._entries = deep.query(result, "/!", { schema:self.currentFacet.schema, resultType:"full"  });
					return result;
				});
			}
			deep.utils.up(ressourceHandler, self);
			deep.chain.addInChain.apply(self, [func]);
			return this;
		},
		get:function (id, options) {
			var self = this;
			var func = function (s,e) {
				if(!self.currentFacet)
					throw new Error("No facet selected before get : ",id);
				return deep.when(self.currentFacet.accessors.get.handler(id, options))
				.then(function (result)
				{
					console.log("facetHandler : get : ", result)
					self._entries = deep.query(result, "/!", { schema:self.currentFacet.schema, resultType:"full"  });
					return result;
				});
			}
			deep.utils.up(ressourceHandler, self);
			deep.chain.addInChain.apply(self, [func]);
			return this;
		},
		query:function (q, options) {
			var self = this;
			var func = function (s,e) {
				if(!self.currentFacet)
					throw new Error("No facet selected before query : ",q);
				return deep.when(self.currentFacet.accessors.query.handler(q, options))
				.done(function (result) {
					//console.log("autobahn.query : result : ", result)
					if(!result || !result.slice)
					{
						result = [];
						self._entries = [];
					}
					else
					{
						result = result.slice(0,result.length);
						self._entries = deep.query(result, "/*", { schema:{ type:"array", items:self.currentFacet.schema }, resultType:"full" });
					}
				});
			}
			//console.log("facetHandler.query : add ressource controle")
			deep.utils.up(ressourceHandler, this);
			deep.chain.addInChain.apply(this, [func]);
			return this;
		},
		post:function (object, options) {
			var self = this;
			var func = function (s,e) {
				if(!self.currentFacet)
					throw new Error("No facet selected before post : ",object);
				return self.currentFacet.accessors.post.handler(object, options);
			}
			deep.chain.addInChain.apply(self, [func]);
			return this;
		},
		put:function (object, options) {
			var self = this;
			var func = function (s,e) {
				console.log("facetHandler.put")
				if(!self.currentFacet)
					throw new Error("No facet selected before put : ",object);
				options = options || {};
				options.id = options.id || object.id;
				return self.currentFacet.accessors.put.handler(object, options)
			}
			deep.chain.addInChain.apply(self, [func]);
			return this;
		},
		patch:function (object, options) {
			var self = this;
			var func = function (s,e) {
				if(!self.currentFacet)
					throw new Error("No facet selected before patch : ",object);
				options = options || {};
				options.id = options.id || object.id;
				return self.currentFacet.accessors.patch.handler(object, options);
			}
			deep.chain.addInChain.apply(self, [func]);
			return this;
		},
		del:function (id, options) {
			var self = this;
			var func = function (s,e) {
				if(!self.currentFacet)
					throw new Error("No facet selected before get : ",id);
				return self.currentFacet.accessors["delete"].handler(id, options);
			}
			deep.chain.addInChain.apply(self, [func]);
			return this;
		}
	});

	var ressourceHandler = deep.utils.bottom(facetHandler, {
		post:function (options) {
			var self = this;
			var func = function (s,e) {
				if(!self.currentFacet)
					throw new Error("No facet selected before post : ",object);

				var alls = [];
				options = options || {};
				self._entries.forEach(function(e){
					alls.push(deep.when(self.currentFacet.accessors.post.handler(e.value, options)));
				})
				return deep.all(alls);
			}
			deep.chain.addInChain.apply(self, [func]);
			return this;
		},
		put:function (options) {
			console.log("ressourceHandler.put")
			var self = this;
			var func = function (s,e) {
				if(!self.currentFacet)
					throw new Error("No facet selected before ressource.put");
				var alls = [];
				options = options || {};
				console.log("before ressource.put : self._entries : ", deep.chain.values(self))
				self._entries.forEach(function(e){
					options.id = e.value.id;
					alls.push(deep.when(self.currentFacet.accessors.put.handler(e.value, options)));
				})
				return deep.all(alls);
			}
			deep.chain.addInChain.apply(self, [func]);
			return this;
		},
		patch:function (options) {
			var self = this;
			var func = function (s,e) {
				if(!self.currentFacet)
					throw new Error("No facet selected before patch : ",object);
				var alls = [];
				options = options || {};
				options.id = options.id || object.id;
				self._entries.forEach(function(e){
					alls.push(deep.when(self.currentFacet.accessors.patch.handler(e.value, options)));
				})
				return deep.all(alls);
			}
			deep.chain.addInChain.apply(self, [func]);
			return this;
		},
		del:function (options) {
			var self = this;
			var func = function (s,e) {
				if(!self.currentFacet)
					throw new Error("No facet selected before get : ",id);
				var alls = [];
				self._entries.forEach(function(e){
					alls.push(deep.when(self.currentFacet.accessors["delete"].handler(e.value.id, options)));
				})
				return deep.all(alls);
			}
			deep.chain.addInChain.apply(self, [func]);
			return this;
		}
	});
	
	var autobahn = function (arg) {
		var handler = deep(autobahnController);
		deep.utils.up(baseHandler, handler);
		if(arguments.length > 0)
			handler.roles(Array.prototype.slice.apply(arguments));
		else if(arg && typeof arg === 'object')
			handler.session(arg);
		//console.log("autobahn start : ", handler)
		return handler; 
	}
	autobahn.utils = utils;
	autobahn.layer = autobahnController;
	return autobahn;

})