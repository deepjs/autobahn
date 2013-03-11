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



define(function (require)
{
	var HTTPrequest = require("promised-io/http-client").request;
	var deep = require("deep/deep");
	var Querier = require("deep/deep-query");
	var autobahnController = require("autobahn/autobahn-controller");
	var utils = require("autobahn/utils");
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
				{
					self.currentRole = session.roleController();
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [self.currentRole, null]);
				}
				else
					deep.when(autobahnController.compileRoles(roles)).then(function (ctrl) {
						self.currentRole = ctrl;
						if(!ctrl)
							throw new Error("No roles selected with : "+JSON.stringify(roles));
						self.running = false;
						deep.chain.nextQueueItem.apply(self, [ctrl, null]);
					},
					function (error) {
						self.running = false;
						deep.chain.nextQueueItem.apply(self, [null, error]);
					});
			}
			deep.chain.addInQueue.apply(self, [func]);
			return this;
		},
		roles:function (list) {
			var self = this;
			list = list || ["public"];
			var func = function (s,e) {
				deep.when(autobahnController.compileRoles(list)).then(function (ctrl) {
					self.currentRole = ctrl;
					//self._entries = []
					if(!ctrl)
						throw new Error("No roles selected with : "+JSON.stringify(list));
				
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [ctrl, null]);
				},
				function (error) {
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [null, error]);
				})
			}
			deep.chain.addInQueue.apply(self, [func]);
			return this;
		},
		facet:function (name) {
			var self = this;
			var func = function (s,e) {
				if(!self.currentRole)
					deep.when(autobahnController.compileRoles(["public"])).then(function (ctrl) {
						self.currentRole = ctrl;
						if(!ctrl)
							throw new Error("No roles selected before facet use");
						//console.log("autobahn.facet :    roles  compiled  :  name : ",name, " - ctrl.facets ", ctrl.facets[name])
						self.currentFacet = ctrl.facets[name];
						if(!self.currentFacet)
							throw new Error("No facet selected with : "+name);
						self.running = false;
						deep.chain.nextQueueItem.apply(self, [self.currentFacet, null]);
					},
					function (error) {
						self.running = false;
						deep.chain.nextQueueItem.apply(self, [null, error]);
					});
				else
				{
					self.currentFacet = self.currentRole.facets[name];
					//console.log("autobahn.facet : current roles already present : name : ",name, " - ctrl.facets ", self.currentRole.facets[name])
					if(!self.currentFacet)
						throw new Error("No facet selected with : "+name);
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [self.currentFacet, null]);
				}
			}
			deep.utils.up(facetHandler, self);
			deep.chain.addInQueue.apply(self, [func]);
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

				deep.when(self.currentFacet.rpc.get.handler(id, options))
				.then(function (result)
				{
					console.log("facetHandler : get : ", result)
					self._entries = deep.query(result, "/!", { schema:self.currentFacet.schema, resultType:"full"  });
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [result, null]); 
				})
				.fail(function (error) {
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [null, error]); 
				});
			}
			deep.utils.up(ressourceHandler, self);
			deep.chain.addInQueue.apply(self, [func]);
			return this;
		},
		get:function (id, options) {
			var self = this;
			var func = function (s,e) {
				if(!self.currentFacet)
					throw new Error("No facet selected before get : ",id);
				deep.when(self.currentFacet.accessors.get.handler(id, options))
				.then(function (result)
				{
					console.log("facetHandler : get : ", result)
					self._entries = deep.query(result, "/!", { schema:self.currentFacet.schema, resultType:"full"  });
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [result, null]); 
				})
				.fail(function (error) {
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [null, error]); 
				});
			}
			deep.utils.up(ressourceHandler, self);
			deep.chain.addInQueue.apply(self, [func]);
			return this;
		},
		query:function (q, options) {
			var self = this;
			var func = function (s,e) {
				if(!self.currentFacet)
					throw new Error("No facet selected before query : ",q);
				deep.when(self.currentFacet.accessors.query.handler(q, options))
				.done(function (result) {
					console.log("autobahn.query : result : ", result)
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

					self.running = false;
					deep.chain.nextQueueItem.apply(self, [result, null]); 
				})
				.fail(function (error) {
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [null, error]); 
				});
			}
			//console.log("facetHandler.query : add ressource controle")
			deep.utils.up(ressourceHandler, this);
			deep.chain.addInQueue.apply(this, [func]);
			return this;
		},
		post:function (object, options) {
			var self = this;
			var func = function (s,e) {
				if(!self.currentFacet)
					throw new Error("No facet selected before post : ",object);
				deep.when(self.currentFacet.accessors.post.handler(object, options)).then(function (result) {
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [result, null]); 
				}, function (error) {
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [null, error]); 
				});
			}
			deep.chain.addInQueue.apply(self, [func]);
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
				deep.when(self.currentFacet.accessors.put.handler(object, options)).then(function (result) {
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [result, null]); 
				}, function (error) {
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [null, error]); 
				});
			}
			deep.chain.addInQueue.apply(self, [func]);
			return this;
		},
		patch:function (object, options) {
			var self = this;
			var func = function (s,e) {
				if(!self.currentFacet)
					throw new Error("No facet selected before patch : ",object);
				options = options || {};
				options.id = options.id || object.id;
				deep.when(self.currentFacet.accessors.patch.handler(object, options)).then(function (result) {
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [result, null]); 
				}, function (error) {
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [null, error]); 
				});
			}
			deep.chain.addInQueue.apply(self, [func]);
			return this;
		},
		del:function (id, options) {
			var self = this;
			var func = function (s,e) {
				if(!self.currentFacet)
					throw new Error("No facet selected before get : ",id);
				deep.when(self.currentFacet.accessors["delete"].handler(id, options)).then(function (result) {
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [result, null]); 
				}, function (error) {
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [null, error]); 
				});
			}
			deep.chain.addInQueue.apply(self, [func]);
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
				deep.all(alls)
				.done(function(results){
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [results, null]); 
				})
				.fail(function(error){
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [null, error]); 
				})
				
			}
			deep.chain.addInQueue.apply(self, [func]);
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
				deep.all(alls)
				.done(function(results){
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [results, null]); 
				})
				.fail(function(error){
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [null, error]); 
				})
			}
			deep.chain.addInQueue.apply(self, [func]);
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
				dself._entries.forEach(function(e){
					alls.push(deep.when(self.currentFacet.accessors.patch.handler(e.value, options)));
				})
				deep.all(alls)
				.done(function(results){
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [results, null]); 
				})
				.fail(function(error){
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [null, error]); 
				})
			}
			deep.chain.addInQueue.apply(self, [func]);
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
				deep.all(alls)
				.done(function(results){
					self.entries = [];
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [results, null]); 
				})
				.fail(function(error){
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [null, error]); 
				})
			}
			deep.chain.addInQueue.apply(self, [func]);
			return this;
		}
	});
	
	var autobahn = function () {
		var handler = deep(autobahnController);
		deep.utils.up(baseHandler, handler);

		//console.log("autobahn start : ", handler)
		return handler; 
	}
	autobahn.utils = utils;

	autobahn.layer = autobahnController;
	deep(deep.request).up({
		post:function  (uri, object, options) 
		{
			console.log("POST from autobahn-plugin")
			
			var headers = {};

			//this.setRequestHeaders(options, headers);

			//console.log("HEADER  : ", headers )
			var postRequest= HTTPrequest({
					method: "POST",
					url:uri,
					body: JSON.stringify(object),
					headers: headers
				});
			
			return deep.when( postRequest )
				.done( function (results) {
					return results
				})
				.fail( function  (error) {
					console.log("error (remote HTTP call failed) while calling remote-services on autobhan post plugin : ", error);
					return error;
				});
		},
		put:function ( uri, object, options) 
		{
			console.log("put from autobahn-plugin")
		}
	})
	return autobahn;

})