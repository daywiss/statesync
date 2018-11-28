# State Sync
Light weight syncronous global state manager using just lodash and a javascript object. 

# Installation
```npm install --save statesync```

# Usage

## Basic Case
```js
  var State = require('statesync')
  var assert = require('assert')

  var state = State()
  var value = state.set('key','value')
  //get the value
  assert.equal(state.get('key'),value)
  //this is equivalent to get
  assert.equal(state('key'),value)

  //get the root state object for read only purposes
  assert(state.get().key,value)
  assert(state().key,value)

  //delete the key value
  state.delete('key')
  //or state.set('key',null)
  assert.equal(state.get('key'),undefined)
  
  //clear all keys in state
  state.delete()
  t.end()

```
## Deep Inspection
Get Set and Delete use lodash's get set and unset methods which means accessing parameters has the same
rules.
```js
  var state = State()
  //set some key value
  state.set('this.is.a.deep.value','true')

  //various ways(but not exhuastive) to get a value
  state.get('this.is.a.deep.value')
  state().this.is.a.deep.value
  state.get(['this','is','a','deep','value'])
  state.get()['this']['is']['a']['deep']['value']
  state('this.is.a.deep.value')
  state(['this','is','a','deep','value'])

  //delete the key value
  state.delete('this.is.a.deep.value')
  t.end()
```

## Arrays
The most recent version of statesync has added basic functions for arrays. This allows for more
fine grained change replication to other statesync objects through diff/patch. Values returned
from functions are the same as JS array operator.

```js
  //array operations: push, pop, unshift, shift, concat
  var state = State({array:[]})

  //first param is the path, 1 is the value to push
  state.push('array',1)  //[1]
  state.push('array',2)  //[1,2]

  state.unshift('array',0) //[0,1,2]

  var val = state.pop('array') //[0,1], val == 2

  val = state.shift('array') // [1], val == 0

  state.concat('array',[2,3]) //[1,2,3]

```

## Events
The state object is a node event emitter, so that api is the same, subscribe with .on or .once, and listen for a 'change' event
or listen to the particular keys you are interested in.
Unsubscribe with .removeListener.

```js
  var state = State()
  //trigger this only once then unsubscribe
  state.once('change',function(state,value,key){
    //state is the entire state from root 
    assert.deepEqual(state,{ greeting:'hello' })

    //key is the key path which was changed, as an array
    assert.deepEqual(key,['greeting'])

    //value is the value that changed at the key
    assert.equal(value,'hello')
  })

  //to listen to a key path, use array notation
  //this will emit any time this path, or subpath changes
  state.on(['deep','key'],function(state,value,key){

    //value which was changed at path
    assert.equal(state,'secret')
    //in this case the value that caused emit is the same as the value of the path
    assert.equal(value,state)

    //key path which changed, as an array
    assert(key,['deep','key'])
  })

  state.set('greeting','hello')

  state.set('deep.key','secret')

```
  

# Advanced Usage

## Initialize Internal State
First paramter allows you to initize state and maintain a reference to the raw object as it is mutated through the state class.  
You should not mutate this object!

```js
    //state pointer will remain a reference to the internal state object
    var statePointer = {
      created:Date.now()  //any initialized data can be placed here
    }

    //first parameter will let you keep handle to internal state for read only purposes
    var state = State(statePointer)

    state.once('change',function(state,value,key){
      //state is the same as our statePointer
      assert.deepEqual(state,statePointer)
      assert.equal(state.read,'me')
      assert.equal(key,'read')
      assert.equal(value,'me')
      assert(state===statePointer)
    })

    state.set('read','me')

    //set has the ability to overwrite the root object with whatever value you want
    //but you will lose your external reference
    state.set(null,{})

    assert(statePointer !== state())

    //so get it back using root()
    statePointer = state.root()

    //if you only want to clear all properties from 
    //the root object without losing external reference it, use delete()

    state.delete()

```

## Immutability
Values which are passed into the state class are mutable outside of the class which could
corrupt the internal state. Add custom clone function
if this mutability is a problem.

```js
  var lodash = require('lodash')

  //second parameter is a custom clone function which gets applied to all gets, sets, deletes and events
  var state = State(null,lodash.cloneDeep)

  state.on('change',function(state,value,key){
    assert.deepEqual(languages,state.languages)
    assert.notEqual(languages, state.languages)
    assert.equal(key,'languages')
    assert.deepEqual(value,languages)
  })

  var languages = [ 'javascript' ]

  state.set('languages',languages)

  //lodash.cloneDeep should keep the internal state safe from this outside mutation
  //by default this would corrupt our state
  languages.push('java')

  assert.notEqual(languages.length,state.get('languages').length)

```

## Sub states or Scopes
Scope from the root state or any child state as many times as you want. Useful if you only want a subsection of your state tree to
be accessible. Child scopes will be referencing values from the root object so they will always be consistent.
Changes to child or parents will emit the appropriate events relative to their scope. 

Important to note that you will want to call 'disconnect' to let scope be garbage collected
when done with it. 

```js
  var defaultState = {
    redteam:{},
    blueteam:{},
    hiddencolor:{
      yellowteam:{}
    }
  }

  var state = State(defaultState)

  var redteam = state.scope('redteam')
  var blueteam = state.scope('blueteam')
  var yellowteam = state.scope('hiddencolor.yellowteam')

  redteam.set('votes',10)
  blueteam.set('votes',11)
  //each one of these can be scoped further as well

  //red and blue scopes are references to the root states objects
  //unless a clone function is supplied
  assert.deepEqual(redteam.get(),defaultState.redteam)
  assert.deepEqual(blueteam.get(),defaultState.blueteam)

  //this is allowed because child scope listens for changes on parent when it affects its root
  state.set('redteam',{votes:12})
  //this is also ok
  state.set('redteam.votes',12)

  //deeper elements will also be properly updated
  //this will cause yellowteam to emit a change event that its value is now undefined
  state.set('hiddencolor',{greenteam:{}})

  //yellow teams parent property, "hiddencolor" was overriden, and now will be undefined
  assert.equal(yellowteam(),null)

  //we are done with scope, disconnect for allow it to be garbage
  blueteam.disconnect()
  yellowteam.disconnect()
  redteam.disconnect()

```

## Replication
You can replicate states directly or with some transport layer. Keep in mind The change feeds are very course, not optimized for size.
You could easily replicate between processes or from server to web client.

Its important to include an equality check function if you have a circular patch, otherwise
you can get an infinite loop and stack overflow.

```js

  //if isEqual is not included, you will get stack overflow since this is a circular patch
  var server = State({},null,lodash.isEqual)
  var client = State({},null,lodash.isEqual)

  server.on('diff',client.patch)
  client.on('diff',server.patch)

  client.set('clientkey','clientsecret')
  server.set('serverkey','serversecret')

  //client and server now share the same state
  assert.deepEqual(client.get(),server.get())

```

# API

## Require
```var State = require('statesync')```

## Initialize
```var state = State(default,clone,equality)```

### Parameters
* default (optional) - An object which acts as a handle to internal state as well as initialization.    
  defaults to ```{}```
* clone (optional) - A syncronous function which returns a cloned object, like lodash.cloneDeep.    
  defaults to: ``` function(x){ return x } ```
* equality (optional) - A syncronous function which returns if 2 values are equal, like lodash.isEqual.    
  defaults to: ``` function(x,y){ return x === y } ```
 
### Returns
a state object

## Set
Set a value on the state. Use lodash "set" notation to access deep properties.
Will emit a change and diff event on every call.   
```var result = state.set(key,value)```

### Parameters
* key (optional) - They key to set, if null, will replace the root of the current scope. This will also invalidate 
any external reference, so it is not recommended to do so use at own risk.
* value (optional) - A value to set, if not provided will set key to null or undefined.

### Returns
the value which was passed with clone applied

## Get
Get a value on the state. Use lodash "get" notation to access deep properties.     

```js
var result = state.get(key,defaultValue)
var result = state(key,defaultValue)

```

## Set Silent
Same as set, but will not cause events to fire. This will also cause values not to replicate with diff.
Use only under special circumstances. You can specify true to change or diff to allow one or the other 
or both events to fire.

```var result = state.setSilent(key,value,change=false,diff=false)```

### Parameters
* key (optional) - They key to set, if null, will replace the root of the current scope. This will also invalidate 
any external reference, so it is not recommended to do so use at own risk.
* value (optional) - A value to set, if not provided will set key to null or undefined.
* change (optional) - Default=false. Will fire a change event if set to true.
* diff (optional) - Default=true. Will fire a diff event if set to true.

### Returns
the value which was passed with clone applied

## Get
Get a value on the state. Use lodash "get" notation to access deep properties.     

```js
var result = state.get(key,defaultValue)
var result = state(key,defaultValue)

```

### Parameters
* key (optional) - They key to get, if null will apply to root 
* defaultValue (optional) - The value to return if key not found, default: undefined   

### Returns
the value at that key with clone applied, or defaultValue if not found

## Delete
Delete a value on the state. Use lodash "unset" notation to access deep properties.
Will emit a change and diff event on every call.   
```var result = state.delete(key)```

### Parameters
* key (optional) - They key to delete, if not provided will clear all properties from the root of the current scope. 
Will not invalidate external handles to state.

### Returns
nothing

## Scope
Scope your visibility to a subtree of the parent scope. Can be called on child as well. All scopes
will respond to changes from any other scope if it affects their path/key by emitting the appropriate
events. You usually do not want to scope dynamically, but in case you do, use 'disconnect' to
allow for cleanup. 

```var result = state.scope(key)```

### Parameters
* key (optional) - They key to scope the child to, if null will be equal to parent
* value (optional) - They value to set this key to. If null, keeps the existing value at the key path. 
* clone (optional) - optional clone function to be applied to this scope only. By default inherits the root clone function.
* equals (optional) - optional equivalence function to be applied to this scope only. By default inherits the root equals function.

### Returns
A state object scoped to the key of the parent scope

## Patch
Update the state based on a diff. Will now emit diff events and emit change events. Not meant to be called
directly by user, but used with the "diff" event. If using patch, it is best to include
an equality check like `lodash.isEqual`.

```var result = state.patch({method,path,value})```

### Parameters
* An object with the following keys
  - method - can be "set" or "delete" as a string.
  - path - the path relative to root which is being modified.
  - value - the value which is changing at the path.

### Returns
null

## Push
Push a value on to an array. If no value exists at the path, an empty array is created. If underlying value is not an array, an error will be throw, an error will be thrown.

```var result = state.push(key,value)```

### Parameters
* key - They key to an array, null if root is array.
* value - Value to push into array.

### Returns
Normal return object for Array.push

## Pop
Pop a value off the end of an array at a specified key, reducing array length by 1. If value is empty, an empty array is created. Returns the
value popped off.

```var result = state.pop(key)```

### Parameters
* key - They key to an array to apply pop operation, null if root is array.

### Returns
The last value of the array. Same as Array.pop

## Shift
Pop a value off the front of the array, reducing length of array by 1.

```var result = state.unshift(key)```

### Parameters
* key - They key to an array to apply shift operation, null if root is array.

### Returns
The first value in the array. Same as Array.shift


## Unshift
Push a value onto the front of the array, increasing array length by 1. If value is empty, will create empty
array to push value onto.

```var result = state.unshift(key)```

### Parameters
* key - They key to an array to apply shift operation, null if root is array.
* value - The value to shift onto array.

### Returns
Same as Array.shift

## Concat
Concatenate an array to the end of an existing array. If key is null an empty array will be created to concat to.

```var result = state.concat(key,value)```

### Parameters
* key - They key of an array to concat to the end of. 
* value - An array to concatenate.

### Returns
Same as Array.concat


## Disconnect
Removes all listeners from this state and will stop emitting events. Also allows scope
to be cleaned up.

### Parameters
none

### Returns
null

# Events

## Change
Anytime there is a potential state change this event is emitted relative to the root of the state object.
This gets fired before key path event. 

```state.on('change',function(state,value,[key]){ })```

### Parameters
* state - a representation of the state with clone applied from the root of current scope
* key - the key path which was called to trigger the event as an array, relative to the scopes root
* value - the value which caused the change, passed with clone applied, null if deleted

## Diff
Anytime there is a potential state change this event is emitted, use in conjuction
with patch. Not normally used directly. If using diff, it is best to include
an equality check like `lodash.isEqual`.           

```state.on('diff',function(action){ })```    

* action - parameter comes as an object      

```
  action = {
    method:'set' or 'delete', 
    path:[] //path/key affected,
    value:any //value passed in
  }
```

## ['some','key']
Events will be emitted on specific keys which sets and deletes happen. You must use
the key array notation for listening to property changes on the state. This gets fired after change event.

```state.on(['some','key'],function(state,value,key){ })```
* state - state at key path "some.key" with clone applied
* value - the value that changed which caused the event, with clone applied, may or may not differ from state
* key - the key which caused the event, will be key path, or a sub path of key path.


