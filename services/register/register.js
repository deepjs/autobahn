"use strict";

var deep = require("deepjs");
require("deep-mail");

chains.Chain.add("register", function(user) {
	var self = this;
	var func = function() {

	};
	func._isDone_ = true;
	return addInChain.call(this, func);
});

var store = new deep.Store({
	protocol:"register",
	mail:{
		options:{
			from:"...",
			to:"...",
			subject:"...",
			//...
		},
		transporter:null
	},
	schema:{
		properties:{
			email: { type:"string", required:true, minLength:6, format:"email" },
			password: { type:"string", required:true, minLength:6 }
		},
		additionnalProperty:false
	},
	post:function(object, options){
		console.log("REGISTER POST", object);
		var self = this;
		var report = deep.validate(object, this.schema);
		if(!report.valid)
			return deep.errors.PreconditionFail("no valid data for registering", report);
	
		return deep.store("user")
		.roles("admin")
		.get("?email="+encodeURIComponent(object.email))
		.done(function(user){
			if(user.length > 0)
				//user already exist
				return deep.errors.Error();
			else
			{
				object.confirmationKey = deep.utils.Hash(object.email + new Date().valueOf() + (Math.random()*2846537) + (Math.random()*956676));
				object.valid = false;
				this.post(object);
			}
		})
		.done(function (user) {
			console.log("REGISTER post : success : /register/"+user.email+"/"+confirmationKey);
			return deep.mail(self.mail.options, user, self.mail.transporter);
		})
		.done(function(){
			return true;
		})
		.fail(function(error){
			throw deep.errors.Internal("error during registering");
		});
	},
	get:function(params, options){
		console.log("register get : ", params);
		return deep
		.roles("admin")
		.store("user")
		.get("?email="+encodeURIComponent(params.email))
		.done(function(user)
		{
			console.log("user key: ", user," get Key : ", params.key);
			console.log("user.confirmationKey: ", user.confirmationKey);
			if(user.confirmationKey !== res.key)
				return  deep.errors.NotFound();
			console.log("confirmation key match : trying validate user");
			this.patch({id:user.id,valid:true});
		})
		.done(function(){
			return true;
		})
		.fail(function(error){
			return deep.errors.NotFound();
		});
	}
};

var service = {
	"/register/?(s:key/s:email)":store
};


module.exports = { service:service, store:store };
