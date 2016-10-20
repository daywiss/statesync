#State Sync
Light weight syncronous global state manager using just lodash and a javascript object.

#Installation
```npm install --save statesync```

#Usage

##Basic Case
```js
  var State = require('statesync')
  var assert = require('assert')

  var state = State()

  //set some key value
  var value = state.set('key','value')

  //get the value
  assert.equal(state.get('key'),value)

  //get the root state object for read only purposes
  assert(state.get().key,value)

  //delete the key value
  state.delete('key')
  //or state.set('key',null)
  assert.equal(state.get('key'),undefined)

```
##Deep Inspection
Get Set and Delete use lodash's get set and unset methods which means accessing parameters has the same
rules, but additionally You can also access the property with an array
```js
  //set some key value
  state.set('this.is.a.deep.value','true')

  //get the value
  assert.equal(state.get('this.is.a.deep.value'),state.get(['this','is','a','deep','value']))
  //also state.get()['this']['is']['a']['deep']['value']

  //delete the key value
  state.delete('this.is.a.deep.value')
```


#Advanced Usage

##Initialize Internal State
First paramter allows you to initize state and maintain a reference to the raw object as it is mutated through the state class.  
You should not mutate this object!

```js
  //state pointer will remain a reference to the internal state object
  var statePointer = {
    created:Date.now()  //any initialized data can be placed here
  }

  //first parameter will let you keep handle to internal state for read only purposes
  var state = State(statePointer)

  state.on('change',function(state,path,value){
    assert.deepEqual(state,statePointer)
    assert(state===statePointer)
  })

  state.set('read','me')

```

##Immutability
Values which are passed into the state class are mutable outside of the class which could
corrupt the internal state. Add custom clone function
if this mutability is a problem.

```js
  var lodash = require('lodash')

  //second parameter is a custom clone function which gets applied to all gets, sets, deletes and events
  var state = State(null,lodash.cloneDeep)

  state.on('change',function(state,path,value){
    assert.deepEqual(languages,state.languages)
    assert.notEqual(languages, state.languages)
  })

  var languages = [ 'javascript' ]

  state.set('languages',languages)

  languages.push('java')

  //lodash.cloneDeep should keep the internal state safe from this mutation
  //by default this would corrupt our state
  assert.notEqual(languages.length,state.get('languages').length)

```

##Sub states or Scopes
Scope from the root state or any child state as many times as you want. Useful if you only want a subsection of your state tree to
be accessible. Modifications to children will be reflected up the tree.
```js
  var defaultState = {
    redteam:{}
    blueteam:{}
  }

  var state = State(defaultState)

  var redteam = state.scope('redteam')
  var blueteam = state.scope('blueteam')

  redteam.set('votes',10)
  blueteam.set('votes',11)
  //each one of these can be scoped further as well

  //red and blue scopes are references to the root states objects
  //unless a clone function is supplied
  assert.deepEqual(redteam.get(),defaultState.redteam)
  assert.deepEqual(blueteam.get(),defaultState.blueteam)
  
```

##Replication
You can replicate states directly or with some transport layer. Keep in mind The change feeds are very course, not optimized for size.
You could easily replicate between processes or from server to web client.
```js

  var server = State()
  var client = State()

  server.on('diff',client.patch)
  client.on('diff',server.patch)


  client.set('clientkey','clientsecret')
  server.set('serverkey','serversecret')

  //client and server now share the same state
  assert.deepEqual(client.get(),server.get())

```

#API

##Require
```var State = require('statesync')```

##Initialize
```var state = State(default,clone,path)```

###Parameters
* default (optional) - An object which acts as a handle to internal state as well as initialization. defaults to ```{}```
* clone (optional) - A syncronous function which returns a cloned object, like lodash.cloneDeep. defaults to: ``` function(x){ return x } ```
* path (optional) - A base path which all sets/gets/deletes will be attached to. defaults to an empty string.

###Returns
a state object

##Set
Set a value on the state. Use lodash "set" notation to access deep properties.
Will emit a change and diff event on every call.
```var result = state.set(key,value)```

###Parameters
* key (optional) - They key to set, if null will apply to root 
* value (optional) - A value to set, if null will delete key

###Returns
the value which was passed with clone applied

##Get
Get a value on the state. Use lodash "get" notation to access deep properties.
```var result = state.get(key)```

###Parameters
* key (optional) - They key to get, if null will apply to root 

###Returns
the value at that key with clone applied

##Delete
Delete a value on the state. Use lodash "unset" notation to access deep properties.
Will emit a change and diff event on every call.
```var result = state.delete(key)```

###Parameters
* key (optional) - They key to delete, if null will clear the whole state

###Returns
null

##Scope
Scope your visibility to a subtree of the parent scope. Can be called on child as well. 
Changes to child will be reflected on parent. Events can be listened to on both. 

```var result = state.scope(key)```

###Parameters
* key (optional) - They key to scope the child to, if null will be equal to parent

###Returns
A state object scoped to the key of the parent scope

##Patch
Update the state based on a diff. Will not emit events.

```var result = state.update(key,value)```

###Parameters
* key (optional) - They key to set, if null will apply to root 
* value (optional) - A value to set, if null will delete key

###Returns
null

#Events

##Change
Anytime there is a potential state change this event is emitted
```state.on('change',function(state,key,value){ })```

###Parameters
* state - a representation of the state with clone applied
* key - the key which was called 
* value - the value which was called, null if deleted

##Diff
Anytime there is a potential state change this event is emitted
```state.on('diff',function(key,value){ })```
* key - the key which was called 
* value - the value which was called, null if deleted



