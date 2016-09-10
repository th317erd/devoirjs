describe("events", function() {
  function testFunc() {
    this.order++;

    if (!this.testFuncFired)
      this.testFuncFired = 0;

    this.testFuncFired++;
  }

  function testFunc2() {
    this.order++;

    if (!this.testFunc2Fired)
      this.testFunc2Fired = 0;

    this.testFunc2Fired++;
  }

  function someOtherFunc() {
    this.order++;

    if (!this.someOtherFunc)
      this.someOtherFunc = 0;

    this.someOtherFuncFired++;
  }

  function EventTest() {
    events.EventEmitter.apply(this, arguments);
    this.order = 0;
  }

  if (this.env.debug)
    debugger;

  var events = require('../../lib/events.js'),
      eventObj;

  EventTest.prototype = Object.create(events.EventEmitter.prototype);

  beforeEach(function() {
    eventObj = new EventTest();
  });

  function testWithNamespace(namespace) {
    function hasNamespace(str) {
      if (namespace)
        return str;
      return '';
    }

    describe("binding", function() {
      it("should be able to bind event with on" + hasNamespace(' (namespaced)'), function() {
        eventObj.on('test', testFunc);
        
        if (namespace) {
          eventObj.on('test.' + namespace, testFunc)
          expect(eventObj.listeners('test').length).toEqual(2);
          expect(eventObj.listeners('test')[0].namespace).toBeFalsy(2);
          expect(eventObj.listeners('test')[1].namespace).toEqual(namespace);
        } else {
          expect(eventObj.listeners('test').length).toEqual(1);
        }
      });

      it("should be able to unbind event with off" + hasNamespace(' (namespaced)'), function() {
        eventObj.on('test', testFunc);

        if (namespace) {
          eventObj.on('test.' + namespace, testFunc)
          expect(eventObj.listeners('test').length).toEqual(2);
          expect(eventObj.listeners('test')[0].namespace).toBeFalsy(2);
          expect(eventObj.listeners('test')[1].namespace).toEqual(namespace);
        } else {
          expect(eventObj.listeners('test').length).toEqual(1);
        }

        if (namespace) {
          eventObj.off('test.' + namespace);
          expect(eventObj.listeners('test').length).toEqual(1);

          eventObj.off('test');
          expect(eventObj.listeners('test').length).toEqual(0);
        } else {
          eventObj.off('test');
          expect(eventObj.listeners('test').length).toEqual(0);
        }
      });

      it("should be able to unbind event with off (specific function)" + hasNamespace(' (namespaced)'), function() {
        eventObj.on('test', testFunc);
        eventObj.on('test', testFunc2);
        expect(eventObj.listeners('test').length).toEqual(2);

        if (namespace) {
          eventObj.on('test.' + namespace, testFunc);
          eventObj.on('test.' + namespace, testFunc2);
          expect(eventObj.listeners('test').length).toEqual(4);

          eventObj.off('test', someOtherFunc);
          expect(eventObj.listeners('test').length).toEqual(4);
          expect(eventObj.listeners('test')[0].listener).toBe(testFunc);
          expect(eventObj.listeners('test')[1].listener).toBe(testFunc2);
          expect(eventObj.listeners('test')[2].listener).toBe(testFunc);
          expect(eventObj.listeners('test')[3].listener).toBe(testFunc2);

          eventObj.off('test.' + namespace, testFunc);
          expect(eventObj.listeners('test').length).toEqual(3);
          expect(eventObj.listeners('test')[0].listener).toBe(testFunc);
          expect(eventObj.listeners('test')[1].listener).toBe(testFunc2);
          expect(eventObj.listeners('test')[2].listener).toBe(testFunc2);

          eventObj.off('test', testFunc2);
          expect(eventObj.listeners('test').length).toEqual(1);
          expect(eventObj.listeners('test')[0].listener).toBe(testFunc);

          eventObj.off('test', testFunc);
          expect(eventObj.listeners('test').length).toEqual(0);          
        } else {
          eventObj.off('test', someOtherFunc);
          expect(eventObj.listeners('test').length).toEqual(2);
          expect(eventObj.listeners('test')[0].listener).toBe(testFunc);
          expect(eventObj.listeners('test')[1].listener).toBe(testFunc2);

          eventObj.off('test', testFunc);
          expect(eventObj.listeners('test').length).toEqual(1);
          expect(eventObj.listeners('test')[0].listener).toBe(testFunc2);

          eventObj.off('test', testFunc2);
          expect(eventObj.listeners('test').length).toEqual(0);
        }
      });

      it("should be able to bind event with addListener" + hasNamespace(' (namespaced)'), function() {
        eventObj.addListener('test' + hasNamespace('.' + namespace), function(){});
        expect(eventObj.listeners('test').length).toEqual(1);
      });

      it("should be able to unbind event with removeListener" + hasNamespace(' (namespaced)'), function() {
        eventObj.addListener('test' + hasNamespace('.' + namespace), function(){});
        expect(eventObj.listeners('test').length).toEqual(1);

        eventObj.removeListener('test' + hasNamespace('.' + namespace));
        expect(eventObj.listeners().length).toEqual(0);
      });

      it("should be able to unbind event with removeListener (specific function)" + hasNamespace(' (namespaced)'), function() {
        eventObj.addListener('test' + hasNamespace('.' + namespace), testFunc);
        eventObj.addListener('test' + hasNamespace('.' + namespace), testFunc2);
        expect(eventObj.listeners('test').length).toEqual(2);

        eventObj.removeListener('test' + hasNamespace('.' + namespace), someOtherFunc);
        expect(eventObj.listeners('test').length).toEqual(2);
        expect(eventObj.listeners('test')[0].listener).toBe(testFunc);
        expect(eventObj.listeners('test')[1].listener).toBe(testFunc2);

        eventObj.removeListener('test' + hasNamespace('.' + namespace), testFunc2);
        expect(eventObj.listeners('test').length).toEqual(1);
        expect(eventObj.listeners('test')[0].listener).toBe(testFunc);

        eventObj.removeListener('test' + hasNamespace('.' + namespace), testFunc);
        expect(eventObj.listeners('test').length).toEqual(0);
      });

      it("should be able to listen to newListener event" + hasNamespace(' (namespaced)'), function() {
        eventObj.on('newListener', function(e, func) {
          expect(func).toBe(testFunc);
          this.newListenerCalled = true;
        });

        eventObj.on('test' + hasNamespace('.' + namespace), testFunc);
        expect(eventObj.newListenerCalled).toBeTruthy();
      });

      it("should be able to listen to removeListener event" + hasNamespace(' (namespaced)'), function() {
        eventObj.on('removeListener', function(e, func) {
          expect(func).toBe(testFunc);
          this.removeListenerCalled = true;
        });

        eventObj.on('test' + hasNamespace('.' + namespace), testFunc);
        eventObj.off('test' + hasNamespace('.' + namespace), testFunc);
        expect(eventObj.removeListenerCalled).toBeTruthy();
      });
    });

    describe("firing", function() {
      it("should be able to fire a synchronous event" + hasNamespace(' (namespaced)'), function() {
        eventObj.on('test', testFunc);

        if (namespace)
          eventObj.on('test.' + namespace, testFunc);
        
        eventObj.emit('test');
        if (namespace)
          eventObj.emit('test.' + namespace);

        if (namespace)
          expect(eventObj.testFuncFired).toEqual(3);
        else
          expect(eventObj.testFuncFired).toEqual(1);
      });

      it("should be able to fire multiple synchronous events" + hasNamespace(' (namespaced)'), function() {
        eventObj.on('test', testFunc);
        eventObj.on('test', testFunc2);

        if (namespace) {
          eventObj.on('test.' + namespace, testFunc);
          eventObj.on('test.' + namespace, testFunc2);
        }

        eventObj.emit('test');
        if (namespace)
          eventObj.emit('test.' + namespace);

        if (namespace) {
          expect(eventObj.testFuncFired).toEqual(3);
          expect(eventObj.testFunc2Fired).toEqual(3);
          expect(eventObj.order).toEqual(6);
        } else {
          expect(eventObj.testFuncFired).toEqual(1);
          expect(eventObj.testFunc2Fired).toEqual(1);
          expect(eventObj.order).toEqual(2);
        }
      });

      it("should be able to fire a asynchronous event" + hasNamespace(' (namespaced)'), function(done) {
        eventObj = new EventTest({async: true});
        eventObj.order = 0;

        eventObj.on('test', function() {
          expect(this.order).toBeGreaterThan(0);
          testFunc.call(eventObj);
        });

        if (namespace) {
          eventObj.on('test.' + namespace, function() {
            expect(this.order).toBeGreaterThan(1);
            testFunc.call(eventObj);
          });
        }

        eventObj.emit('test');
        if (namespace)
          eventObj.emit('test.' + namespace);

        setTimeout(function() {
          if (namespace) {
            expect(eventObj.testFuncFired).toEqual(3);
            expect(eventObj.order).toEqual(4);
          } else {
            expect(eventObj.testFuncFired).toEqual(1);
            expect(eventObj.order).toEqual(2);
          }
          done();
        }, 10);

        expect(eventObj.order).toEqual(0);
        eventObj.order++;
      }, 1000);

      it("should be able to fire multiple asynchronous events" + hasNamespace(' (namespaced)'), function(done) {
        eventObj = new EventTest({async: true});
        eventObj.order = 0;

        eventObj.on('test', function() {
          expect(this.order).toBeGreaterThan(0);
          testFunc.call(eventObj);
        });

        eventObj.on('test', function() {
          expect(this.order).toBeGreaterThan(1);
          testFunc2.call(eventObj);
        });

        if (namespace) {
          eventObj.on('test.' + namespace, function() {
            expect(this.order).toBeGreaterThan(2);
            testFunc.call(eventObj);
          });

          eventObj.on('test.' + namespace, function() {
            expect(this.order).toBeGreaterThan(3);
            testFunc2.call(eventObj);
          });
        }

        eventObj.emit('test');
        if (namespace)
          eventObj.emit('test.' + namespace);

        setTimeout(function() {
          if (namespace) {
            expect(eventObj.testFuncFired).toEqual(3);
            expect(eventObj.testFunc2Fired).toEqual(3);
            expect(eventObj.order).toEqual(7);
          } else {
            expect(eventObj.testFuncFired).toEqual(1);
            expect(eventObj.testFunc2Fired).toEqual(1);
            expect(eventObj.order).toEqual(3);
          }
          done();
        }, 10);

        expect(eventObj.order).toEqual(0);
        eventObj.order++;
      });
    }, 1000);
  }

  testWithNamespace();
  testWithNamespace('testNS');
});
