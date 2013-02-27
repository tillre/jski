
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
	var additionalAllowed = !(schema.hasOwnProperty('additionalProperties')
							  && !schema.additionalProperties);

	//
	// check dependencies
	//
	if (schema.dependencies) {
	  var checkDep = function(object, key, dependency) {
		if (typeof dependency === 'string') {
		  // simple dependency
		  if (object.hasOwnProperty(key) && !object.hasOwnProperty(dependency)) {
			errors.push(error, path + '.' + key, 'Property does not meet dependency');
		  }
		}
		else if (isArray(dependency)) {
		  // array of dependencies, recurse
		  dependency.forEach(function(dep) {
			checkDep(object, key, dep);
		  });
		}
		else if (typeof dependency === 'object') {
		  // schema dependency
		  validate(dependency, object, path, errors);
		}
	  };
	  
	  Object.keys(schema.dependencies).forEach(function(key) {
		if (!value.hasOwnProperty(key)) {
		  errors.push(error(path + '.' + key, 'Property does not exist, but has dependency'));
		}
		else checkDep(value, key, schema.dependencies[key]);
	  });
	}

	//
	// check regular properties
	//
	if (schema.properties) {
	  Object.keys(schema.properties).forEach(function(key) {
		var subPath = path + '.' + key,
			subSchema = schema.properties[key];
		
		if (value.hasOwnProperty(key)) {
		  validate(schema.properties[key], value[key], subPath, errors);
		}
		else if (subSchema.required) {
		  errors.push(error(subPath, 'Property is missing from object'));
		}
	  });
	}

	//
	// check additional-, pattern- and superfluous-properties
	//
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

	//
	// validate single item-schema array
	//
	if (schema.items && !isArray(schema.items)) {
	  value.forEach(function(item, i) {
		validate(schema.items, item, path + '[' + i + ']', errors);
	  });
	  return;
	}

	//
	// validate array tuple schema
	//
	var i = 0;
	if (schema.items && isArray(schema.items)) {
	  for (; i < schema.items.length; ++i) {
		subPath = '[' + i + ']';
		if (i < value.length) {
		  validate(schema.items[i], value[i], subPath, errors);
		}
		else {
		  errors.push(error(subPath), 'Item does not exist in instance');
		  continue;
		}
	  }
	}

	if (i === value.length) {
	  // all values validated
	  return;
	}

	//
	// check if no additional items are allowed
	//
	if (schema.hasOwnProperty('additionalItems') && !schema.additionalItems) {
	  errors.push(error(path, 'Additional items are not allowed'));
	  return;
	}

	//
	// validate additional items
	//
	if (schema.additionalItems) {
	  // validate single-schema additional items
	  if (!isArray(schema.additionalItems)) {
		for(; i < value.length; ++i) {
		  validate(schema.additionalItems, value[i], path + '[' + i + ']', errors);
		}
	  }
	  else {
		// validate against an array of additional schemas
		for(; i < value.length; ++i) {
		  var subPath = '[' + i + ']';
		  var isValid = false;
		  schema.additionalItems.forEach(function(subSchema) {
			var errs = [];
			validate(subSchema, value[i], subPath, errs);
			isValid = errs.length === 0 ? true : isValid;
		  });
		  if (!isValid) {
			errors.push(error(subPath, 'Item not valid'));
		  }
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

  // infer object type
  if (!schema.type && schema.properties) {
	schema.type = 'object';
  }
  
  if (schema.type) {
	if (isArray(schema.type)) {
	  // union type
	  var valid = false;
	  schema.type.forEach(function(type) {
		if (validators[type]) {
		  var localErrors = [];
		  validators[type](schema, data, path, localErrors);
		  if (localErrors.length === 0) {
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
