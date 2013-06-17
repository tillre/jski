var Validator = require('./validator.js');
var common = require('./common.js');
var serialize = require('./serialize.js');


//
// *Of Validator
//

function OfValidator(items, type) {

  this.items = items;
  Validator.call(this, type);
}

common.extend(OfValidator.prototype, Validator.prototype);


OfValidator.prototype.toJSON = function() {
  var schema = {};
  schema[this.type] = this.items.map(function(item) {
    return item.toJSON();
  });
  return Validator.prototype.toJSON.call(this, schema);
};


OfValidator.prototype.fromJSON = function(schema) {
  this.items = schema[this.type].map(function(item) {
    return serialize.fromJSON(item);
  });
  return Validator.prototype.fromJSON.call(this, schema);
};


//
// AllOf Validator
//

function AllOfValidator(items) {

  OfValidator.call(this, items, 'allOf');

  this.addCheck(function(value, options, path) {
    var errors = [];
    var self = this;
    
    this.items.forEach(function(item) {
      self.addErrors(errors, item.validate(value, options, path));
    });
    return errors;
  });
};

common.extend(AllOfValidator.prototype, OfValidator.prototype);


//
// AnyOf Validator
//

function AnyOfValidator(items) {

  OfValidator.call(this, items, 'anyOf');

  this.addCheck(function(value, options, path) {
    var errors = [];
    var valid = false;

    this.items.forEach(function(item) {
      valid = item.validate(value, options, path).length === 0 || valid;
    });
    if (!valid) {
      this.addError(errors, 'Value does not match any of the schemas', path);
    }
    return errors;
  });
};

common.extend(AnyOfValidator.prototype, AllOfValidator.prototype);


//
// OneOf Validator
//

function OneOfValidator(items) {

  OfValidator.call(this, items, 'oneOf');

  this.addCheck(function(value, options, path) {
    var errors = [];
    var valid = 0;

    this.items.forEach(function(item) {
      valid += (item.validate(value, options, path).length === 0) ? 1 : 0;
    });
    if (valid === 0) {
      this.addError(errors, 'Value does not validate against one of the schemas');
    }
    if (valid > 1) {
      this.addError(errors, 'Value does validate against more than one of the schemas');
    }
    return errors;
  });
};

common.extend(OneOfValidator.prototype, AllOfValidator.prototype);


//
// exports
//

module.exports = {
  AllOfValidator: AllOfValidator,
  AnyOfValidator: AnyOfValidator,
  OneOfValidator: OneOfValidator
};