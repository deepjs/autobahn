
/*
var ErrorConstructor = require("./util/extend-error").ErrorConstructor;
var AccessError = exports.AccessError = ErrorConstructor("AccessError");






var MethodNotAllowedError = exports.MethodNotAllowedError = ErrorConstructor("MethodNotAllowedError", AccessError);

var DatabaseError = exports.DatabaseError = ErrorConstructor("DatabaseError");

var NotFoundError = exports.NotFoundError = ErrorConstructor("NotFoundError", DatabaseError);
NotFoundError.prototype.code = 2;

var PreconditionFailed = exports.PreconditionFailed = ErrorConstructor("PreconditionFailed", DatabaseError);
PreconditionFailed.prototype.code = 3;
*/

if(typeof define !== 'function'){
	var define = require('amdefine')(module);
}

define(function(require){
	var Compose = require("compose");
	var toString = function () {
		return JSON.stringify(this);
	}
	var common = { toString:toString, headers:null, body:null, message:null, status:null };
	var AccessError = Compose( Error,function(message){ this.message = message; this.status = 404; this.headers = {}; this.body = []; }, common );

	var Conflict = Compose( Error,function(message){ this.message = message; this.status = 409; }, common);
	var Unauthorized = Compose( Error,function(message){ this.message = message; this.status = 401; }, common);
	var TimeOutError = Compose( Error,function(message){ this.message = message; this.status = 408; }, common);
	var ForbiddenError = Compose( Error,function(message){ this.message = message; this.status = 403; }, common);
	var ClientError = Compose( Error,function(message, status){ this.message = message; this.status = status; }, common);
	var ServerError = Compose( Error,function(message, status){ this.message = message; this.status = status; }, common);

	var MethodNotAllowedError = Compose(Error, function(message){ this.message = message; this.status = 405; }, common);

	var DatabaseError = Compose(Error, function(message){ this.message = message; this.status = 404; }, common);

	var NotFoundError = Compose(Error, function(message){ this.message = message; this.status = 404; }, common)

	var PreconditionFailed = Compose(Error, function(message, report){ this.message = message; this.status = 412; this.report = report; }, common)


	return {
		Server:ServerError,
		Unauthorized:Unauthorized,
		Client:ClientError,
		TimeOut:TimeOutError,
		Forbidden:ForbiddenError,
		Access:AccessError,
		MethodNotAllowed:MethodNotAllowedError,
		Database:DatabaseError,
		NotFound:NotFoundError,
		PreconditionFailed:PreconditionFailed,
	}
})