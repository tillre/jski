var Validator = require('./validator.js');
var common = require('./common.js');

//
// Ref Validator
//

var RefValidator = module.exports = function(refName) {

  this.ref = refName;
  Validator.call(this, '$ref');

  this.addCheck(function(value, options, path) {
    var errors = [];

    if (options.omitRefs) return errors;

    if (options && options.definitions && options.definitions[this.ref]) {
      this.addErrors(errors, options.definitions[this.ref].validate(value, options, path));
    }
    else {
      this.addError(errors, '$ref', 'Definition of schema reference not found: ' + value, path);
    }
    return errors;
  });
};

common.extend(RefValidator.prototype, Validator.prototype);


RefValidator.prototype.toJSON = function() {
  return Validator.prototype.toJSON.call(this, { $ref: this.ref });
};


RefValidator.prototype.fromJSON = function(schema) {
  this.ref = schema.$ref;
  return Validator.prototype.fromJSON.call(this, schema);
};
