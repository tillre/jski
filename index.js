

function isArray(obj) {
  if (Array.isArray) return Array.isArray(obj);
  return toString.call(obj) == '[object Array]';
}


function isObject(obj) {
  return obj === Object(obj);
}


function extend(a, b) {
  for (var n in b) {
    a[n] = b[n];
  }
  return a;
}


function inherit(a, b) {
  extend(a.prototype, b.prototype);
}


function makeError(message, path) {
  var err = new Error(message);
  err.path = path;
  return err;
}


function addError(errors, message, path) {
  errors.push(makeError(message, path));
  return errors;
}


function addErrors(errors, newErrors) {

  newErrors.forEach(function(err) {
    errors.push(err);
  });
  return errors;
}


function isKeyword(key) {
  return ['type', 'enum', 'allOf', 'anyOf', 'oneOf', '$ref'].indexOf(key) !== -1;
};


function fromJSON(schema) {

  var validator;
  
  if (schema.type || schema.properties || schema.items) {

    var type = schema.type;
    // infer 'array' and 'object' type
    if (schema.properties) type = 'object';
    if (schema.items) type = 'array';
    
    validator = new ({
      'boolean': BooleanValidator,
      'number': NumberValidator,
      'integer': IntegerValidator,
      'string': StringValidator,
      'any': AnyValidator,
      'null': NullValidator,
      'array': ArrayValidator,
      'object': ObjectValidator
    })[type]();
  }
  else if (schema.enum) {
    validator = new EnumValidator();
  }
  else if (schema.allOf) {
    validator = new AllOfValidator();
  }
  else if (schema.anyOf) {
    validator = new AnyOfValidator();
  }
  else if (schema.oneOf) {
    validator = new OneOfValidator();
  }
  else if (schema.$ref) {
    validator = new RefValidator();
  }

  if (!validator) {
    console.log('unkown schema', schema, new Error().stack);
    throw new Error('Unkown schema');
  }
  
  return validator.fromJSON(schema);
}


//
// Validator
//

function Validator(type) {

  this.type = type;
  this.options = {};
  this.constraints = [];
  this.customAttributes = [];

  // meta keywords
  this.addOption('title', '');
  this.addOption('description', '');
  this.addOption('default');
}


Validator.prototype.toJSON = function() {

  var schema = { type: this.type };
  var self = this;

  Object.keys(this.options).forEach(function(key) {
    if (self.options[key].enabled) {
      schema[key] = self.options[key].value;
    }
  });

  this.constraints.forEach(function(constraint) {
    if (constraint.enabled) {
      schema[constraint.name] = constraint.toJSON ? constraint.toJSON() : constraint.value;
    }
  });

  Object.keys(this.customAttributes).forEach(function(key) {
    schema[key] = self.customAttributes[key];
  });
  
  return schema;
};


Validator.prototype.fromJSON = function(schema) {

  var self = this;

  Object.keys(schema).forEach(function(key) {

    if (isKeyword(key)) return;
    
    if (self.options.hasOwnProperty(key)) {
      self.options[key] = {
        enabled: true,
        value: schema[key]
      };
    }
    else {
      var isConstraint = false;
      
      self.constraints.forEach(function(constraint) {
        if (constraint.name === key) {
          self[constraint.name](constraint.fromJSON(schema[key]));
          isConstraint = true;
        }
      });

      if (!isConstraint) {
        self.customAttributes[key] = schema[key];
      }
    }
  });

  return this;
};


Validator.prototype.addOption = function(name, defaultValue) {

  this.options[name] = {
    enabled: false,
    value: defaultValue
  };

  this[name] = function(value) {
    this.options[name] = {
      enabled: true,
      value: value
    };
    return this;
  };
};


Validator.prototype.addConstraint = function(name, validate, toJSON, fromJSON) {

  var self = this;
  
  var constraint = {
    name: name,
    value: null,
    enabled: false,

    validate: function(value, options, path) {
      path = path || '';
      return validate.call(self, value, this.value, options, path);
    },
    toJSON: function() {
      return toJSON ? toJSON(this.value) : this.value;
    },
    fromJSON: function(schema) {
      return fromJSON ? fromJSON(schema) : schema;
    }
  };

  this[name] = function(value) {
    constraint.value = value;
    constraint.enabled = true;
    return this;
  };

  this.constraints.push(constraint);
};


Validator.prototype.custom = function(name, value) {

  this.customAttributes[name] = value;
  return this;
};


Validator.prototype.validate = function(value, options, path) {

  path = path || '';
  var errors = [];

  this.constraints.forEach(function(constraint) {
    if (constraint.enabled) {
      addErrors(errors, constraint.validate(value, options, path));
    }
  });
  return errors;
};


//
// Boolean Validator
//

function BooleanValidator() {

  Validator.call(this, 'boolean');
}


inherit(BooleanValidator, Validator);


BooleanValidator.prototype.validate = function(value, options, path) {

  path = path || '';
  var errors = [];

  if (!(typeof value === 'boolean')) {
    addError(errors, 'Value is not a boolean', path);
  }
  return errors;
};


//
// Number Validator
//

function NumberValidator() {

  Validator.call(this, 'number');

  this.addConstraint(
    'multipleOf',
    function(value, n, options, path) {
      return value % n === 0 ? [] : [
        makeError('Value is not a multiple of: ' + n, path)
      ];
    }
  );
  
  this.addConstraint(
    'maximum',
    function(value, n, options, path) {
      return value <= n ? [] : [
        makeError('Value is greater than the maximum: ' + n, path)
      ];
    }
  );
  
  this.addConstraint(
    'minimum',
    function(value, n, options, path) {
      return value >= n ? [] : [
        makeError('Value is less than minimum: ' + n, path)
      ];
    }
  );
}


inherit(NumberValidator, Validator);


NumberValidator.prototype.validate = function(value, options, path) {

  path = path || '';
  var errors = [];
  
  if (!(typeof value === 'number')) {
    addError(errors, 'Value is not a number', path);
  }
  return addErrors(errors, Validator.prototype.validate.apply(this, arguments));
};


//
// Integer Validator
//

function IntegerValidator() {

  NumberValidator.call(this, arguments);
  this.type = 'integer';
}


inherit(IntegerValidator, NumberValidator);


IntegerValidator.prototype.validate = function(value, options, path) {

  path = path || '';
  var errors = [];

  if (!(typeof value === 'number') || Math.floor(value) !== value) {
    addError(errors, 'Value is not a integer', path);
  }
  return addErrors(errors, NumberValidator.prototype.validate.apply(this, arguments));
};


//
// StringValidator
//

function StringValidator() {

  Validator.call(this, 'string');

  this.addConstraint(
    'maxLength',
    function(value, n, options, path) {
      return value.length <= n ? [] : [
        makeError('Value is less than minimum: ' + n, path)
      ];
    }
  );

  this.addConstraint(
    'minLength',
    function(value, n, options, path) {
      return value.length >= n ? [] : [
        makeError('Value is less than minimum: ' + n, path)
      ];
    }
  );

  this.addConstraint(
    'pattern',
    function(value, p, options, path) {
      return new RegExp(p).test(value) ? [] : [
        makeError('Value does not match pattern: ' + p, path)
      ];
    }
  );

  this.addConstraint(
    'format',
    function(value, f, options, path) {
      if (!formats[f]) {
        return [makeError('Unkown format: ' + f, path)];
      }
      if (!formats[f].test(value)) {
        return [makeError('Value does not match format: ' + f, path)];
      }
      return [];
    }
  );
}


inherit(StringValidator, Validator);


StringValidator.prototype.validate = function(value, options, path) {

  path = path || '';
  var errors = [];
  
  if (!(typeof value === 'string')) {
    return addError(errors, 'Value is not a string', path);
  }
  return addErrors(errors, Validator.prototype.validate.apply(this, arguments));
};


//
// Array Validator
//

function ArrayValidator(items) {

  Validator.call(this, 'array');
  
  this.addOption('additionalItems', true);
  
  this.addConstraint(
    'maxItems',
    function(value, m, options, path) {
      return value.length <= m ? [] : [
        makeError('Number of items is larger than maximum: ' + m, path)
      ];
    }
  );
  
  this.addConstraint(
    'minItems',
    function(value, m, options, path) {
      return value.length >= m ? [] : [
        makeError('Number of items is less than minimum: ' + m, path)
      ];
    }
  );
  
  this.addConstraint(
    'uniqueItems',
    function(value, u, options, path) {
      if (!u) return [];

      var errors = [];
      var cache = {};

      for (var i = 0; i < value.length; ++i) {
        var str = JSON.stringify(value[i]);
        if (cache[str]) {
          addError(errors, 'Array items are not unique', path);
          break;
        }
        cache[str] = true;
      };
      return errors;
    }
  );
  
  this.addConstraint(
    'items',
    function(values, items, options, path) {

      var errors = [];
      var self = this;

      if (isArray(items)) {

        // array tuple

        values.forEach(function(value, i) {
          if (i < items.length) {
            addErrors(errors, items[i].validate(value, options, path + '[' + i + ']'));
          }
          else  if (!self.options.additionalItems.value){
            addError(errors, 'Array index outside tuple length: ' + i, path + '[' + i + ']');
          }
        });
      }
      else if (isObject(items) && !this.options.additionalItems.value) {

        // array
        
        values.forEach(function(value, i) {
          addErrors(errors, items.validate(value, options, path + '[' + i + ']'));
        });
      }

      return errors;
    },
    
    function(items) {
      if (isArray(items)) {
        return items.map(function(item) {
          return item.toJSON();
        });
      }
      else {
        return items.toJSON();
      }
    },

    function(schema) {
      if (isArray(schema)) {
        return schema.map(function(item) {
          return fromJSON(item);
        });
      }
      else {
        return fromJSON(schema);
      }
    }
  );

  // set items constraint
  if (items) this.items(items);
}


inherit(ArrayValidator, Validator);


ArrayValidator.prototype.validate = function(values, options, path) {

  path = path || '';
  var errors = [];
  var self = this;
  
  if (!isArray(values)) {
    return addError(errors, 'Value is not a array', path);
  }
  
  return addErrors(errors, Validator.prototype.validate.apply(this, arguments));
};


//
// Object Validator
//

function ObjectValidator(properties) {

  Validator.call(this, 'object');
  
  this.addOption('additionalProperties', true);

  this.addConstraint(
    'maxProperties',
    function(value, m, options, path) {
      return Object.keys(value).length <= m ? [] : [
        makeError('Number of properties is larger than maximum: ' + m, path)
      ];
    }
  );
  
  this.addConstraint(
    'minProperties',
    function(value, m, options, path) {
      return Object.keys(value).length >= m ? [] : [
        makeError('Number of properties is less than minimum: ' + m, path)
      ];
    }
  );
  
  this.addConstraint(
    'required',
    function(value, reqs, options, path) {
      var errors = [];
      var self = this;
      
      reqs.forEach(function(name) {
        if (!value.hasOwnProperty(name)) {
          addError(errors, 'Required property is missing: ' + name, path);
        }
      });
      return errors;
    }
  );
  
  this.addConstraint(
    'properties',

    function(value, properties, options, path) {
      var errors = [];
      
      for (var n in value) {
        if (properties[n]) {
          addErrors(errors, properties[n].validate(value[n], options, path + '.' + n));
        }
        else if (!this.options.additionalProperties.value) {
          addError(errors, 'Object has no property with name: ' + n, path + '.' + n);
        }
      }
      return errors;
    },

    function(properties) {
      var schema = {};
      Object.keys(properties).forEach(function(key) {
        schema[key] = properties[key].toJSON();
      });
      return schema;
    },

    function(schema) {
      properties = {};
      Object.keys(schema).forEach(function(key) {
        properties[key] = fromJSON(schema[key]);
      });
      return properties;
    }
  );

  // shortcut to set constraint
  if (properties) this.properties(properties);
}


inherit(ObjectValidator, Validator);


ObjectValidator.prototype.validate = function(value, options, path) {

  path = path || '';
  var errors = [];
  
  if (!isObject(value) || isArray(value)) {
    addError(errors, 'Value is not an object', path);
  }

  return addErrors(errors, Validator.prototype.validate.apply(this, arguments));
};


//
// Enum Validator
//

function EnumValidator(items) {

  this.items = items || [];
  Validator.call(this, 'enum');
}


inherit(EnumValidator, Validator);


EnumValidator.prototype.toJSON = function() {
  return { 'enum': this.items };
};


EnumValidator.prototype.fromJSON = function(schema) {
  this.items = schema.enum;
  return this;
};


EnumValidator.prototype.validate = function(value, options, path) {

  path = path || '';
  var errors = [];
  var valid = false;
  
  this.items.forEach(function(item) {
    if (!valid) {
      if (isObject(item) || isArray(item)) {
        valid = JSON.stringify(item) === JSON.stringify(value);
      }
      else {
        valid = item === value;
      }
    }
  });

  if (!valid) {
    addError(errors, 'Not a valid enumeration item: ' + value, path);
  }

  return addErrors(errors, Validator.prototype.validate.apply(this, arguments));
};


//
// Any Validator
//

function AnyValidator() {

  Validator.call(this, 'any');
}

inherit(AnyValidator, Validator);

AnyValidator.prototype.validate = function(value, options, path) {
  return addErrors([], Validator.prototype.validate.apply(this, arguments));
};


//
// Null Validator
//

function NullValidator() {

  Validator.call(this, 'null');
}

inherit(NullValidator, Validator);

NullValidator.prototype.validate = function(value, options, path) {

  path = path || '';
  var errors = [];

  if (typeof value !== 'object' || value !== null) {
    addError(errors, 'Value is not null', path);
  }
  
  return addErrors(errors, Validator.prototype.validate.apply(this, arguments));
};


//
// AllOf Validator
//

function AllOfValidator(items) {

  this.items = items;
  Validator.call(this, 'allOf');
}

inherit(AllOfValidator, Validator);


AllOfValidator.prototype.toJSON = function() {
  var schema = {};
  schema[this.type] = this.items.map(function(item) {
    return item.toJSON();
  });
  return schema;
};


AllOfValidator.prototype.fromJSON = function(schema) {
  this.items = schema[this.type].map(function(item) {
    return fromJSON(item);
  });
  return this;
};


AllOfValidator.prototype.validate = function(value, options, path) {

  path = path || '';
  var errors = [];

  this.items.forEach(function(item) {
    addErrors(errors, item.validate(value, options, path));
  });

  return addErrors(errors, Validator.prototype.validate.apply(this, arguments));
};


//
// AnyOf Validator
//

function AnyOfValidator(items) {

  AllOfValidator.call(this, items);
  this.type = 'anyOf';
}

inherit(AnyOfValidator, AllOfValidator);


AnyOfValidator.prototype.validate = function(value, options, path) {

  path = path || '';
  var errors = [];
  var valid = false;

  this.items.forEach(function(item) {
    valid = item.validate(value, options, path).length === 0 || valid;
  });
  if (!valid) {
    addError(errors, 'Value does not match any of the schemas', path);
  }

  return addErrors(errors, Validator.prototype.validate.apply(this, arguments));
};


//
// OneOf Validator
//

function OneOfValidator(items) {

  AllOfValidator.call(this, items);
  this.type = 'oneOf';
}

inherit(OneOfValidator, AllOfValidator);

OneOfValidator.prototype.validate = function(value, options, path) {

  path = path || '';
  var errors = [];
  var valid = 0;

  this.items.forEach(function(item) {
    valid += (item.validate(value, options, path).length === 0) ? 1 : 0;
  });
  if (valid === 0) {
    addError(errors, 'Value does not validate against one of the schemas');
  }
  if (valid > 1) {
    addError(errors, 'Value does validate against more than one of the schemas');
  }

  return addErrors(errors, Validator.prototype.validate.apply(this, arguments));
};


//
// Ref Validator
//

function RefValidator(refName) {

  this.ref = refName;
  Validator.call(this, '$ref');
}

inherit(RefValidator, Validator);


RefValidator.prototype.toJSON = function() {
  return { $ref: this.ref };
};


RefValidator.prototype.fromJSON = function(schema) {
  this.ref = schema.$ref;
  return this;
};


RefValidator.prototype.validate = function(value, options, path) {

  path = path || '';
  var errors = [];
  
  if (options && options.definitions && options.definitions[this.ref]) {
    addErrors(errors, options.definitions[this.ref].validate(value, options, path));
  }
  else {
    addError(errors, 'Definition of schema reference not found: ' + value, path);
  }

  return addErrors(errors, Validator.prototype.validate.apply(this, arguments));
};


//
// exports
//

module.exports = {
    
  boolean: function() { return new BooleanValidator(); },
  number:  function() { return new NumberValidator(); },
  integer: function() { return new IntegerValidator(); },
  string:  function() { return new StringValidator(); },
  any:     function() { return new AnyValidator(); },
  null:    function() { return new NullValidator(); },
  array:   function(items) { return new ArrayValidator(items); },
  object:  function(properties) { return new ObjectValidator(properties); },
  'enum':    function(items) { return new EnumValidator(items); },
  allOf:   function(items) { return new AllOfValidator(items); },
  anyOf:   function(items) { return new AnyOfValidator(items); },
  oneOf:   function(items) { return new OneOfValidator(items); },
  ref:     function(name) { return new RefValidator(name); },

  schema: fromJSON
};


//
// Format Regexps
//

var formats = {
  // originally taken from https://github.com/flatiron/revalidator/
  'email': /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i,
  'ip-address': /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/i,
  'ipv6': /^([0-9A-Fa-f]{1,4}:){7}[0-9A-Fa-f]{1,4}$/,
  'date-time': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:.\d{1,3})?Z$/,
  'date': /^\d{4}-\d{2}-\d{2}$/,
  'time': /^\d{2}:\d{2}:\d{2}$/,
  'color': /^#[a-z0-9]{6}$|^#[a-z0-9]{3}$|^(?:rgba?\(\s*(?:[+-]?\d+%?)\s*,\s*(?:[+-]?\d+%?)\s*,\s*(?:[+-]?\d+%?)\s*(?:,\s*(?:[+-]?\d+%?)\s*)?\))$/i,
  //'style': (not supported)
  //'phone': (not supported)
  //'uri': (not supported)
  'host-name': /^(([a-zA-Z]|[a-zA-Z][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])$/,
  'utc-millisec': /^\d+$/,
  'regex': {
    test: function (value) {
      try { var re = new RegExp(value); }
      catch (e) { return false }
      return true;
    }
  },
  // non standard
  url: /^(http|ftp|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&amp;:/~\+#]*[\w\-\@?^=%&amp;/~\+#])?$/,
  slug: /^([a-zA-Z]|[a-zA-Z][a-zA-Z0-9\-]*[a-zA-Z0-9])*$/
};

