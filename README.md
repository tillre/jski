jski - json schema validator
============================

JSON Schema support
-------------------
jski validates a subset of json schema v4. Following features are missing or restricted:

* no union types
* array: additionalItems can only be true or false, not a schema
* object: additionalProperties can only be true or false
* object: no patternProperties
* object: no dependencies
* $ref: definitions are solely looked up by name in `options.definitions` or `jski.object({...}).defintions({...})`
* not: not supported


Installation
------------

`npm install jski`


Examples
--------

### Create schema using method chaining

```javascript

var jski = require('jski');

var schema = jski.object({
  foo: jski.number(),
  bar: jski.string().maxLength(255)
});

var errs = schema.validate({ foo: 11, bar: 'hello' });

```

### Create schema from json

```javascript

var jski = require('jski');

var js = {
  foo: { type: 'number' },
  bar: { type: 'string', maxLength: 255 }
};

var schema = jski.schema(js);

var errs = schema.validate({ foo: true, bar: 'hello' });

```

### Get schema in json form

```javascript

var jski = require('jski');

var js = jski.object({ foo: jski.string() }).toJSON();

```

API
---

### Building schemas with method chaining

#### Types

* `jski.boolean()`
* `jski.number()
       .minimum(1).maximum(10).multipleOf()`
* `jski.integer()` - Same as number
* `jski.string()
       .minLength(1).maxLength(10).pattern('[0-9]*').format('email')`
* `jski.array(jski.number())
       .minItems(1).maxItems(10).uniqueItems(true).additionalItems(false)`
* `jski.array(jski.number(), jski.string(), jski.boolean())`
* `jski.object({ foo: jski.number() })
       .minProperties(1).maxProperties(10).required('foo', 'bar').additionalProperties(false)`
* `jski.enum(1, 2, 3)`
* `jski.any()`
* `jski.null()`
* `jski.allOf(schema1, schema2, schema3)`
* `jski.anyOf(schema1, schema2, schema3)`
* `jski.oneOf(schema1, schema2, schema3)`

#### Common methods available to all types

* `jski.number().title('foo').description('bar').default(11)`

### Validation

`validate(value, options)` returns an error array. When the value is valid, the array is empty.

* `var errors = jski.number().maximum(127).validate(128)`

### Definitions

Add Defintions:

* by method: `jski.object({...}).definitions({...})`
* by options: `var errors = jski.object({...}).validate({...}, { definitions: {...} })`

### Serializing schemas from/to JSON

* `jski.schema(Schema JSON)`
* `jski.object().toJSON()`

### Create a default value for a schema

* `jski.createValue(jski.number())`
* `jski.createValue({ type: 'number' })`

### Options

`jski.object().validate(value, { definitions: defs, omitRefs: true })`

* `definitions` - Dict where $refs are lookuped by name
* `omitRefs` - Do not validate $refs