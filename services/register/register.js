"use strict";
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require","deepjs"], function (require,deep) {
	var postmark = require("postmark")("a26ad5d9-eaf4-412e-b7fb-3c4803b945f9");
	var crypto = require("crypto");
	var queryString = require("querystring");
	
	var services = {
		"/register/:id?":{
			backgrounds:[deep.Store],
			protocol:"register",
			templates:{
				registerMailTemplate : "swig::..."
			},
			schema:{
				properties:{
					email: { type:"string", required:true, minLength:6, format:"email" },
					password: { type:"string", required:true, minLength:6, "private":true }
				}
			},
			post:function(object, options){
				console.log("REGISTER POST", object);
				var report = deep.validate(object, this.schema || this.facet.schema);
				if(!report.valid)
					return deep.errors.PreconditionFail("no valid data for registering", report);
				var confirmationKey = crypto.createHash('sha1').update(object.email + new Date().valueOf() + (Math.random()*2846537) + (Math.random()*956676)).digest('hex');
			
				var digest = crypto.createHash('sha1').update(object.password).digest('hex');

				return deep.store("user")
				.modes({ roles:"admin" })
				.get("?email="+encodeURIComponent(object.email))
				.done(function(success){
					if(success.length > 0)
					{
						//user already exist
						throw deep.errors.PreconditionFail("wrong data for registering");
					} else
					{
						return deep.roles(["admin"])
						.store("user")
						.post({
							email: object.email,
							password: digest,
							confirmationKey :confirmationKey,
							valid:false
						});
					}
				})
				.done(function (user) {
					console.log("deep context request = ", deep.context.request);
					var textMail = "Hi " + user.firstName + ",\r\n\r\n";
					textMail += "Ready for take-off?\r\n";
					textMail += "You're only one click away! To complete your Smart registration, please follow this link:\r\n";
					textMail += "?id="+user.id+"&key="+confirmationKey + "\r\n\r\n";
					textMail += "Welcome to Smart!\r\n\r\nThe Smart Team\r\n";
					textMail += "\r\n\r\n\r\n";
					textMail += "---\r\n";
					textMail += "Have questions about your Smart account? Please visit the Support Center:\r\n";
					textMail += "https://smarteu.org";
					console.log("GET key : ", "var d = deep.store('register').get('" + "id="+user.id+"&key="+confirmationKey + "').log()");
					var def = deep.Deferred();
					postmark.send({
						"From": "account.confirmation@smart-eu.org",
						"To": decodeURIComponent(user.email),
						"Subject": "Smart-eu registration confirmation",
						"TextBody": textMail
					}, function(error, success)
					{
						if(error) {
							console.log("Unable to send via postmark: " + error.message);
							def.reject("message failed to be send.");
							return false;
						}
						def.resolve(true);
					});
					return def.promise();
				})
				.fail(function(error){
					throw deep.errors.Internal("error during registering");
				});
			},
			get:function(url, options){
				var res = queryString.parse(url);
				console.log("register query string : ", res);
				return deep
				.roles("admin")
				.store("user")
				.get(res.id, options)
				.done(function(user)
				{
					console.log("user key: ", user," get Key : ", res.key);
					console.log("user.confirmationKey: ", user.confirmationKey);
					if(user.confirmationKey !== res.key)
						return  deep.errors.NotFound();
					console.log("confirmation key match : trying validate user");
					this.patch({id:user.id,valid:true});
				})
				.fail(function(error){
						return deep.errors.NotFound();
				})
				.done(function(){
					
					return "hello : " + url;
					//return response.redirect(deep.context.request, autobahn.settings.domain+"/#/login");
				});
			}
		}
	};

	return services;

});

