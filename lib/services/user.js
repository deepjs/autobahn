// absolute alpha ;) use at your own risk.
"use strict";

var deep = require("deepjs");
require("deep-mail"); // to send email on registration

var services = {
	"/user":deep.ocm({
		admin:deep.Mongo({
			collectionName:"user",
			url:"mongodb://127.0.0.1:27017/open-talk",
			index:{
				email:{ keys:{ email:"text" }, options:{ unique:true }}
			},
			schema:{
				properties:{
					email: { type:"string", required:true, minLength:6, format:"email" },
					password: { type:"string", required:true, minLength:6, transformer:deep.transformers.Hash },
					valid:{ type:"bool", required:true, "default":false },
					key:{ type:"string", required:true }
				},
				additionnalProperty:false,
				links:[]
			}
		}),
		user:{
			backgrounds:["this::../admin", deep.store.AllowOnly("get")],
			schema:{
				ownerRestriction:"id",
				properties:{
					email:{ readOnly:true },
					password:{ readOnly:true },
					valid:{ readOnly:true },
					key:{ readOnly:true }
				}
			}
		},
		'public':{
			// nothing
		}
	}, { protocol:"user", sensibleTo:"roles" }),

	"/register/?(s:key/s:email)/$":new deep.Store({ // custom store
		protocol:"register",
		mail:{
			options:{
				from: "Fred Foo ✔ <foo@blurdybloop.com>", // sender address
			    to: "bar@blurdybloop.com, baz@blurdybloop.com", // list of receivers
			    subject: "Hello ✔", // Subject line
			    text: "Hello world ✔", // plaintext body       
			    html: "swig::/your/template.html" // html body
			},
			transporter:deep.mail.nodemailer("SMTP", {
				service: "Gmail",
			    auth: {
			        user: "gmail.user@gmail.com",
			        pass: "userpass"
			    }
			})
		},
		schema:{
			properties:{
				email: { type:"string", required:true, minLength:6, format:"email" },
				password: { type:"string", required:true, minLength:6 },
			}
		},
		get:function(params, options){
			if(!params.email || !params.key)
				return deep.errors.NotFound();
			return deep.modes({ roles:"admin" })
			.store("user")
			.get("?email="+encodeURIComponent(params.email)+"&key="+encodeURIComponent(params.key))
			.done(function(user){
				if(user.length == 0)
					return deep.errors.NotFound();
				user = user.shift();
				this.patch({ id:user.id, valid:true });
			})
			.done(function(){
				return true;
			})
		},
		post:function(object, options)
		{
			var self = this;
			return deep(object, this.schema)
			.validate()
			.modes({ roles:"admin" })
			.store(store)
			.done(function(){
				object.key = deep.utils.Hash(object.email + new Date().valueOf() + (Math.random()*2846537) + (Math.random()*956676));
				object.valid = false;
			})
			.post()
			.done(function (user) {
				console.log("REGISTER post : success : /register/"+user.email+"/"+user.key);
				return deep.mail(self.mail.options, user, self.mail.transporter);
			})
			.done(function(){
				return true;
			})
			.fail(function(error){
				return deep.errors.NotFound("error during registration");
			});
		}
	}),

	"/change-password/?(s:email)/$":new deep.Store({ // custom store
		protocol:"change-password",
		mail:{	
			options:{
				from: "Fred Foo ✔ <foo@blurdybloop.com>", // sender address
			    to: "bar@blurdybloop.com, baz@blurdybloop.com", // list of receivers
			    subject: "Hello ✔", // Subject line
			    text: "Hello world ✔", // plaintext body       
			    html: "swig::/your/template.html" // html body
			},
			transporter:deep.mail.nodemailer("SMTP", {
				service: "Gmail",
			    auth: {
			        user: "gmail.user@gmail.com",
			        pass: "userpass"
			    }
			})
		},
		schema:{
			properties:{
				key:{ type:"string", required:"true"},
				email:{ type:"string", required:"true", format:"email"},
				password:{ type:"string", required:"true"},
			}
		},
		get:function(params, options){
			// send email
			if(!params.email)
				return deep.errors.NotFound();
			return deep.store("user")
			.get("?email="+encodeURIComponent(params.email))
			.done(function(){
				if(user.length === 0)
					return deep.errors.NotFound();
				user = user[0];
				if(!user.valid)
				{
					// should do something special here : 
					// send another mail that warn user that this procedure was fired but user's email hasn't been validated
					return deep.errors.Forbidden();
				}
				this.patch({ id:user.id, key:deep.utils.Hash(user.email + new Date().valueOf() + (Math.random()*2846537) + (Math.random()*956676))});
			})
			.done(function (user) {
				console.log("CHANGE PASSWORD : will send email");
				// send email with instruction to reset password. should contains key.
				return deep.mail(self.mail.options, user, self.mail.transporter);
			})
			.done(function(){
				return true;
			})
			.fail(function(error){		// by security we mask any error by anonymous 400
				return deep.errors.Store();
			});
		},
		// post { email:"...", key:"...", password:"...."} to apply 
		post:function(object, options)
		{
			var self = this;
			return deep(object, this.schema)
			.modes({ roles:"admin" })
			.validate()
			.store("user")
			.get("?email="+encodeURIComponent(object.email)+"&passkey="+encodeURIComponent(object.key))
			.done(function (user) {
				if(user.length === 0)
					return deep.errors.NotFound();
				user = user[0];
				if(!user.valid)
				{
					// should do something special here : 
					// send another mail that warn user that this procedure was fired but user's email hasn't been validated
					return deep.errors.Forbidden();
				}
				this.patch({ 
					id:user.id, 
					password:deep.utils.Hash(object.password), 
					key:deep.utils.Hash(new Date().valueOf() + (Math.random()*2846537) + (Math.random()*956676))	// invalid previous key
				});
			})
			.done(function(){
				return true;
			})
			.fail(function(error){	// by security we mask any error by anonymous 400
				return deep.errors.Store();
			});
		}
	})
};


module.exports = { services:services, store:store };
