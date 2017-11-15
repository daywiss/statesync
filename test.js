var test = require('tape')
var lodash = require('lodash')
var State = require('.')

test('statesync',function(t){
  var state = null
  t.test('init',function(t){
    state = State()
    t.ok(state)
    t.end()
  })
  t.test('set',function(t){
    t.ok(state.set('test','test'))
    t.ok(state.set('test1','test1'))
    t.end()
  })
  t.test('get state',function(t){
    var result = state.get('test')
    // console.log(result)
    t.equal('test',result)
    t.end()
  })
  t.test('get null',function(t){
    var result = state.get()
    t.ok(result)
    t.ok(result.test)
    t.end()
  })
  t.test('get from constructor',function(t){
    var result = state()
    t.ok(result)
    t.ok(result.test,state('test'))
    t.end()
  })
  t.test('delete state',function(t){
    state.delete('test')
    t.equal(state.get('test'),undefined)
    t.notOk(state.get('test'))
    t.ok(state.get('test1'))
    t.end()
  })
  t.test('array get set delete',function(t){
    var key = ['a','deep','value']
    t.ok(state.set(key,true))
    t.ok(state.get(key))
    state.delete(key)
    t.notOk(state.get(key))
    t.end()
  })
  t.test('events',function(t){
    t.test('root path event',function(t){
      t.plan(3)
      state.once(['blah'],t.ok)
      state.set('blah','some value')
      state.once(['blah'],t.ok)
      state.set('blah.nested','some nested value')
      state.once(['blah','nested'],t.ok)
      state.set('blah.nested.deeper.deeper','deep')
    })
    t.test('root event',function(t){
      t.plan(1)
      state.once('change',t.ok)
      state.set('blah','root event')
    })
    t.test('scope event',function(t){
      t.plan(2)
      var scope = state.scope('blah')
      scope.once(['child'],t.ok)
      scope.once('change',t.ok)
      state.set('blah.child','some value')
    })
    t.test('me',function(t){
      t.plan(1)
      state.once(['me'],t.ok)
      state.set('me',{a:'object'})
    })
    t.test('delete',function(t){
      var state = State({blah:'blah'})
      t.plan(1)
      state.on('change',t.ok)
      state.delete()
    })
    t.test('null root',function(t){
      var state = State({blah:'blah'})
      t.plan(1)
      state.on('change',t.notOk)
      state.set([],null)
    })
    //test fails, need node 6 event emitter to fix
    t.test('parent change child event',function(t){
      var state = State({teams:{
        red:4,blue:3,green:4
      }})
      
      t.plan(3)

      state.on(['teams','green'],t.ok)
      state.on(['teams','red'],t.ok)
      state.on(['teams','blue'],t.ok)

      state.set('teams',{})
    })
  })
  t.test('scope',function(t){
    var scope = null
    t.test('init',function(t){
      scope = state.scope('scope')
      t.ok(scope)
      t.end()
    })
    t.test('set/get',function(t){
      scope.set('child','child')
      t.equal(scope.get('child'),'child')
      t.equal(state.get('scope.child'),'child')
      t.equal(scope.get(),state.get('scope'))
      t.end()
    })
    t.test('delete',function(t){
      scope.delete('child')
      t.notOk(scope.get('child'))
      t.notOk(state.get('scope.child'))
      t.end()
    })
    t.test('set child through parent',function(t){
      scope.set('replaceme',true)
      state.set('scope',{replaced:true})
      t.equal(state.get('scope'),scope.get())
      state.set('scope.child',true)
      t.equal(state.get('scope.child'),scope.get('child'))
      t.end()
    })
    t.test('scope root path',function(t){
      var scope = state.scope()
      t.deepEqual(scope.get(),state.get())

      t.equal(scope.get(),state.get())
      t.deepEqual(scope.get(),state.get())

      scope.delete()
      t.equal(scope.get(),state.get())
      t.deepEqual(scope.get(),state.get())

      scope.set('event',true)

      t.end()
    })
    t.test('scope root path evnts',function(t){
      t.plan(1)
      var state = State()
      var scope = state.scope()
      state.on('change',function(s,value,path){
        t.equal(true,value)
      })
      scope.set('event',true)
    })
    t.test('parent event when child changes',function(t){
      t.plan(1)
      var state = State()
      var scope = state.scope()
      state.on('change',function(s,value,path){
        t.equal(true,value)
      })
      scope.set('some.deep.value',true)
    })
  })
  t.test('diff/patch',function(t){
    t.test('example',function(t){
      var s1Pointer = {}
      var s1 = State(s1Pointer,null,lodash.isEqual)
      var s2 = State()

      s1.on('change',function(state,value,path){
        t.deepEqual(state,s1Pointer)
        t.ok(state === s1Pointer)
      })

      s1.on('diff',s2.patch)
      s2.on('diff',s1.patch)

      s1.set('s1',true)
      s2.set('s2',true)
      s1.set('blah',1)
      s2.set('blah',2)
      s2.set('blah',2)
      s1.delete('s2')
      t.equal(s1.get('blah'),2)
      t.deepEqual(s1.get(),s2.get())
      t.deepEqual(s1.get(),s1Pointer)
      t.end()
    })
    t.test('path and value exist',function(t){
      var state = State()
      state.patch({method:'set',path:[true],value:true})
      state.patch({method:'set',path:[false],value:false})
      t.ok(state.get('true'))
      t.equal(state.get('false'),false)
      t.end()
    })
    t.test('path exists and value doesnt',function(t){
      var state = State({path:{dir:'somethinghere'}})
      state.patch({method:'set',path:['path'],value:null})
      t.notOk(state.get('path'))
      t.end()
    })
    t.test('value exists path doesnt',function(t){
      var state = State({path:{dir:'somethinghere'}})
      state.patch({method:'set',path:['path'],value:'replaced'})
      t.deepEqual(state.get('path'),'replaced')
      t.end()
    })
    t.test('path and value dont exist',function(t){
      var state = State({path:{dir:'somethinghere'}})
      state.patch({method:'set',path:[],value:{}})
      t.deepEqual(state.get(),{})
      t.end()
    })
    t.test('updating scope child set',function(t){
      var state = State({a:1,b:{}})
      var child = state.scope('b')
      t.plan(3)
      state.on('diff',function(diff){
        t.equal(diff.method,'set')
        t.deepEqual(diff.path,['b','c'])
        t.equal(diff.value,'test')
      })
      child.set('c','test')
      t.end()
    })
    t.test('updating scope child delete',function(t){
      var state = State({a:1,b:{}})
      var child = state.scope('b',{c:'test'})
      t.plan(2)
      state.on('diff',function(diff){
        t.equal(diff.method,'delete')
        t.deepEqual(diff.path,['b','c'])
      })
      child.delete('c')
      t.end()
    })
    t.test('updating disconnected scopes',function(t){
      var statea = State({a:1,b:{}})
      var stateb = State({})

      var scope = statea.scope('b')

      stateb.on('diff',scope.patch)

      // scope.on('diff',function(){
      //   console.log('scope',arguments)
      // })
      // statea.on('diff',function(){
      //   console.log('statea',arguments)
      // })              
      // stateb.on('diff',function(){
      //   console.log('stateb',arguments)
      // })              
      stateb.set(null,{c:'test'})
      stateb.set('d',{})
      stateb.set('d',{e:'deep'})

      t.equal(statea.get('b.c'),'test')
      t.equal(statea.get('b.d.e'),'deep')

      t.end()
    })
  })
  t.test('internal pointer',function(t){
    var ptr = {test:'test'}
    var state = State(ptr)
    t.test('set root to null',function(t){
      t.equal(state.get('test'),'test')
      state.set('newval',true)
      t.equal(ptr,state.get())
      t.end()
    })
    t.test('delete root',function(t){
      t.equal(state.get('test'),'test')
      state.delete('test')
      t.equal(ptr,state.get())
      t.end()
    })
  })
  t.test('destroy',function(t){
    var child1 = state.scope('child1')
    var child2 = state.scope('child2')
    state.disconnect()
    child1.set('test',true)
    child2.set('test',true)
    state.on('change',t.end)
    state.on('diff',t.end)
    t.end()
  })
  
})
