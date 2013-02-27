/*global describe it expect*/

var validate = require('../index.js');

describe('Validation of JSON schema', function() {

  it('should validate empty schema with any object', function() {
	expect(validate(null, {foo: 'bar'}).valid).toBe(true);
	expect(validate({}, {foo: 'bar'}).valid).toBe(true);
  });

  it('is not valid when it has errors', function() {
	expect(validate({type: 'string'}, 42).errors.length).toBeGreaterThan(0);
	expect(validate({type: 'string'}, 42).valid).toBe(false);
  });


  describe('5.1. types', function() {
	it('should validate simple types', function() {
	  expect(validate({type: 'string'}, '').valid).toBe(true);
	  expect(validate({type: 'number'}, 3.3).valid).toBe(true);
	  expect(validate({type: 'integer'}, 3).valid).toBe(true);
	  expect(validate({type: 'integer'}, 3.3).valid).toBe(false);
	  expect(validate({type: 'boolean'}, true).valid).toBe(true);
	  expect(validate({type: 'object'}, {}).valid).toBe(true);
	  expect(validate({type: 'array'}, []).valid).toBe(true);
	  expect(validate({type: 'null'}, null).valid).toBe(true);
	  expect(validate({type: 'any'}, 123).valid).toBe(true);
	});

	it('should validate union types', function() {
	  expect(validate({type: ['string', 'number']}, '').valid).toBe(true);
	  expect(validate({type: ['string', 'number']}, 42).valid).toBe(true);
	});
  });


  describe('5.2. object properties', function() {
	var schema = {type: 'object', properties: {foo: {type: 'number'}, bar: {type: 'null'}}};

	it('should be valid', function() {
	  expect(validate(schema, {foo: 42, bar: null}).valid).toBe(true);
	});
	it('should be valid with additional properties not in the schema', function() {
	  expect(validate(schema, {foo: 42, bar: null, baz: 'hello'}).valid).toBe(true);
	});
	it('should not be valid when properties are of the wrong type', function() {
	  expect(validate(schema, {foo: 42, bar: ""}).valid).toBe(false);
	});
  });
  

  describe('5.3. pattern object properties', function() {
	var schema = {type: 'object', patternProperties: {'\\w+_bar': {type: 'number'}}};

	it('should be valid', function() {
	  expect(validate(schema, {foo_bar: 1, baz_bar: 2}).valid).toBe(true);
	});
	it('should not be valid when not matching', function() {
	  expect(validate(schema, {foo_bar: 1, bar_foo: 2}).valid).toBe(false);
	});
  });
  

  describe('5.4. additional object properties', function() {
	var schema = {type: 'object',
				  properties: {foo: {type: 'number'}, bar: {type: 'null'}},
				  additionalProperties: {baz: {type: 'string'}}};

	it('should be valid with additional defined properties', function() {
	  expect(validate(schema, {foo: 42, bar: null, baz: ''}).valid).toBe(true);
	});
	it('should not be valid when no schema is found for property', function() {
	  expect(validate(schema, {foo: 42, bar: null, baz: []}).valid).toBe(false);
	});
  });


  describe('5.5. array items', function() {
	var tupleSchema = {type: 'array',
					   items: [{type: 'string'}, {type: 'number'}, {type: 'null'}]};
	
	it('should validate an array tuple', function() {
	  expect(validate(tupleSchema, ["hello", 42, null]).valid).toBe(true);
	});
	it('should not validate an invalid array tuple', function() {
	  expect(validate(tupleSchema, ["hello", 42, 123]).valid).toBe(false);
	});
	it('should validate an array with additional items', function() {
	  expect(validate(tupleSchema, ["hello", 42, null, 'go']).valid).toBe(true);
	});

	var singleSchema = {type: 'array', items: {type: 'boolean'}};
	it('should validate an array of items conforming to the schema', function() {
	  expect(validate(singleSchema, [true, false, true]).valid).toBe(true);
	});
	it('should not validate an array of items not conforming to the schema', function() {
	  expect(validate(singleSchema, [true, '', true]).valid).toBe(false);
	});
	
  });


  describe('5.6. array of additional items', function() {
	it('should not validate a array with disallowed additional items', function() {
	  var schema = {type: 'array',
					items: [{type: 'number'}, {type: 'boolean'}],
					additionalItems: false};
	  expect(validate(schema, [1, true, 3, '']).valid).toBe(false);
	});
	it('should validate a array tuple and with additional item', function() {
	  var schema = {type:'array',
					items: [{type: 'number'}, {type: 'boolean'}],
					additionalItems: {type: 'string'}};
	  expect(validate(schema, [1, false, '']).valid).toBe(true);
	});
	it('should validate a array tuple with additional items', function() {
	  var schema = {type:'array',
					items: [{type: 'number'}, {type: 'string'}],
					additionalItems: [{type: 'boolean'}, {type: 'null'}]};
	  expect(validate(schema, [1, '', null, false, null, true]).valid).toBe(true);
	});
	it('should validate a array with a additional item', function() {
	  var schema = {type: 'array',
					additionalItems: {type: 'boolean'}};
	  expect(validate(schema, [false, true, false, true]).valid).toBe(true);
	});

	var addSchema = {type: 'array',
					 additionalItems: [{type: 'boolean'}, {type: 'number'}, {type: 'string'}]};
	it('should validate a array with additional items in randowm order', function() {
	  expect(validate(addSchema, [3, 1, true, '', false, '', '']).valid).toBe(true);
	});
	it('should not validate an array with invalid additional item', function() {
	  expect(validate(addSchema, [3, 1, null, '']).valid).toBe(false);
	});
  });

  
  describe('5.7. required', function() {
	var schema = {type: 'object',
				  properties: {
					foo: {type: 'string', require: true},
					bar: {type: 'number'}
				  }};
	it('should validate when required property is present', function() {
	  expect(validate(schema, {foo: '', bar: 42}).valid).toBe(true);
	});
	it('should not validate when required property is missing', function() {
	  expect(validate(schema, {bar: 11}).valid).toBe(true);
	});
  });

  
  describe('5.8. dependencies', function() {
	var schema = {type: 'object',
				  properties: {a: {type: 'string'}, 'b': {type: 'number'}},
				  dependencies: {a: 'b'}};
	it('should validate object when dependency is met', function() {
	  expect(validate(schema, {a: '', b: 11}).valid).toBe(true);
	});
	it('should not validate object when dependency is not met', function() {
	  expect(validate(schema, {a: ''}).valid).toBe(false);
	});

	var simpleArraySchema = {type: 'object',
							 properties: {a: {type: 'string'}, b: {type: 'number'}},
							 dependencies: {a: ['b', 'c'], b: 'a', c: ['a', 'b']}};
	it('should validate object with simple array dependencies', function() {
	  expect(validate(simpleArraySchema, {a: '', b: 11, c: 12}).valid).toBe(true);
	});
	it('should not validate object when simple array dependencies are not met', function() {
	  expect(validate(simpleArraySchema, {a: '', b: 11}).valid).toBe(false);
	});

	var schemaSchema = {type: 'object',
						properties: {a: {type: 'string'}, b: {type: 'number'}},
						dependencies: {a: { properties: {b: {type: 'number', required: true}}}}};
	it('should validate object with schema dependency', function() {
	  expect(validate(schemaSchema, {a: '', b: 11}).valid).toBe(true);
	});
	it('should not validate object with schema dependency not met', function() {
	  expect(validate(schemaSchema, {a: '', b: ''}).valid).toBe(false);
	});

	var schemaArraySchema = {type: 'object',
							 properties: {a: {type: 'string'}, b: {type: 'number'}},
							 dependencies: {
							   a: [
								 { properties: {b: {type: 'number', required: true}}},
								 { properties: {c: {type: 'string', required: true}}}
							   ]
							 }};
	it('should validate object with array of schema dependencies', function() {
	  expect(validate(schemaArraySchema, {a: '', b: 11, c: ''}).valid).toBe(true);
	});
	it('should not validate object with array of schema dependencies not met', function() {
	  expect(validate(schemaArraySchema, {a: '', b: 11, c: true}).valid).toBe(false);
	});
  });


  describe('5.9. minimum', function() {
	it('should validate if the number is greater than or equal to the minimum', function() {
	  expect(validate({type: 'number', minimum: 3.3}, 3.3).valid).toBe(true);
	  expect(validate({type: 'number', minimum: 3.3}, 4).valid).toBe(true);
	});
	it('should not validate if the number is below the minimum', function() {
	  expect(validate({type: 'number', minimum: 3.3}, 3.2).valid).toBe(false);
	});
	it('should validate if the integer is greate than or equal to the minimum', function() {
	  expect(validate({type: 'integer', minimum: 3}, 3).valid).toBe(true);
	  expect(validate({type: 'integer', minimum: 3}, 4).valid).toBe(true);
	});
	it('should not validate if the integer is below the minimum', function() {
	  expect(validate({type: 'integer', minimum: 3}, 2).valid).toBe(false);
	});
  });
});
