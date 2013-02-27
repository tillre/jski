
// json schema validation

var error = function(path, msg) {
  console.log('error: ', path, msg);
  return { path: path, message: msg };
};

var isArray = function(a) {
  return Object.prototype.toString.call(a) === '[object Array]';
};


var validators = {
  'string': function(schema, value, path, errors) {
	if (typeof value !== 'string') {
	  errors.push(error(path, 'Value is not a string'));
	}
  },
  
  'number': function(schema, value, path, errors) {
	if (typeof value !== 'number') {
	  errors.push(error(path, 'Value is not a number'));
	}
  },
  
  'integer': function(schema, value, path, errors) {
	if (typeof value !== 'number') {
	  errors.push(error(path, 'Value is not a number'));
	  return;
	}
	if (Math.ceil(value) !== value) {
	  errors.push(error(path, 'Value a number, but not an integer'));
	}
  },

  'boolean': function(schema, value, path, errors) {
	if (typeof value !== 'boolean') {
	  errors.push(error(path, 'Value is not a boolean'));
	}
  },
  
  'object': function(schema, value, path, errors) {
	if (typeof value !== 'object' || isArray(value)) {
	  errors.push(error(path, 'This is not an object'));
	  return;
	}
	var pattern = schema.patternProperties ? Object.keys(schema.patternProperties) : [];
	var additionalAllowed = !(schema.hasOwnProperty('additionalProperties') && !schema.additionalProperties);

	if (schema.properties) {
	  // make sure all schema properties have a corresponding valid instance property
	  Object.keys(schema.properties).forEach(function(key) {
		var subPath = path + '.' + key;
		if (value.hasOwnProperty(key)) {
		  validate(schema.properties[key], value[key], subPath, errors);
		}
		else {
		  errors.push(error(subPath, 'Property does not exist on object'));
		}
	  });
	}

	// make sure all instance properties conform to a schema
	Object.keys(value).forEach(function(key) {
	  if (schema.properties && schema.properties[key]) {
		// we already checked these
		return;
	  }
	  var subPath = path + '.' + key;
	  
	  if (!additionalAllowed) {
		errors.push(error(subPath, 'Additional property is not allowed on object'));
		return;
	  }
	  if (schema.additionalProperties || schema.patternProperties) {
		// property has to validate against either additional schema or pattern schema
		if (schema.additionalProperties && schema.additionalProperties[key]) {
		  validate(schema.additionalProperties[key], value[key], subPath, errors);
		  return;
		}
		// check pattern
		if (schema.patternProperties) {
		  for (var i = 0; i < pattern.length; ++i) {
			if (key.match(new RegExp(pattern[i]))) {
			  validate(schema.patternProperties[pattern[i]], value[key], path, errors);
			  return;
			}
		  }
		}
		// no schema with instance name found
		errors.push(error(subPath, 'Property not allowed on object'));
	  }
	});

  },
  
  'array': function(schema, value, path, errors) {
	if (!isArray(value)) {
	  errors.push(error(path, 'Value is not an array'));
	  return;
	}
	var i = 0;
	
	if (schema.items) {
	  if (isArray(schema.items)) {
		// validate array tuple
		// TODO: allow additional items in tuple
		for (; i < value.length; ++i) {
		  if (schema.items.length > i) {
			validate(schema.items[i], value[i], path + '[' + i + ']', errors);
		  }
		  else {
			errors.push(error(path + '[' + i + ']'), 'Entry not valid for tuple schema');
		  }
		}
	  }
	  else {
		// validate array of one type
		for (; i < value.length; ++i) {
		  validate(schema.items[i], value[i], path + '[' + i + ']', errors);
		}
	  }
	}
	else if (schema.additionalItems) {
	  // validate array of many types
	  for (; i < value.length; ++i) {
		var valid = false,
			subPath = path + '[' + i + ']';

		schema.additionalItems.forEach(function(subSchema) {
		  var errs = [];
		  validate(subSchema, value[i], subPath, errs);
		  if (errs.length === 0) valid = true;
		});
		if (!valid) {
		  errors.push(error(subPath, 'Item does not validate as additional item'));
		}
	  }
	}
  },
  
  'null': function(schema, value, path, errors) {
	if (value !== null) {
	  errors.push(error(path, 'Value is not null'));
	}
  },

  'any': function(schema, value, path, errors) {
  }
};


var validate = function(schema, data, path, errors) {
  // if (schema.$ref) {
  // 	if (schemas[schema.$ref]) {
  // 		// TODO: replace schema at this point with schema from reference
  //      _.extend(schema, subSchema);
  // 	}
  // 	else {
  // 		errors.push(error(path, 'Could not resolve schema ' + schema.$ref));
  // 	}
  // }
  
  if (schema.type) {
	if (isArray(schema.type)) {
	  // union type
	  var valid = false;
	  schema.type.forEach(function(type) {
		if (validators[type]) {
		  var errs = [];
		  validators[type](schema, data, path, errs);
		  if (errs.length === 0) {
			valid = true;
			return;
		  }
		}
		else {
		  errors.push(path, 'Unkown type ' + type);
		}
	  });
	  if (!valid) {
		errors.push(path, 'Failed to validate union type');
	  }
	}
	else {
	  // simple type
	  if (validators[schema.type]) {
		validators[schema.type](schema, data, path, errors);
	  }
	  else {
		errors.push(path, 'Unkown type ' + schema.type);
	  }
	}
  }
};


// expose validate
module.exports = function(schema, data) {
  var errors = [];
  validate(schema, data, '', errors);

  return {
	valid: errors.length === 0,
	errors: errors
  };
};
