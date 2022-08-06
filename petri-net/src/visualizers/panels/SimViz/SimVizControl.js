// /*globals define, WebGMEGlobal*/
// /**
//  * Generated by VisualizerGenerator 1.7.0 from webgme on Mon Aug 01 2022 19:13:23 GMT-0400 (Eastern Daylight Time).
//  */

// define([
//   "js/Constants",
//   "js/Utils/GMEConcepts",
//   "js/NodePropertyNames",
// ], function (CONSTANTS, GMEConcepts, nodePropertyNames) {
//   "use strict";

//   function SimVizControl(options) {
//     this._logger = options.logger.fork("Control");

//     this._client = options.client;

//     // Initialize core collections and variables
//     this._widget = options.widget;

//     this._currentNodeId = null;
//     this._currentNodeParentId = undefined;

//     this._initWidgetEventHandlers();

//     this._logger.debug("ctor finished");
//   }

//   SimVizControl.prototype._initWidgetEventHandlers = function () {
//     this._widget.onNodeClick = function (id) {
//       // Change the current active object
//       WebGMEGlobal.State.registerActiveObject(id);
//     };
//   };

//   /* * * * * * * * Visualizer content update callbacks * * * * * * * */
//   // One major concept here is with managing the territory. The territory
//   // defines the parts of the project that the visualizer is interested in
//   // (this allows the browser to then only load those relevant parts).
//   SimVizControl.prototype.selectedObjectChanged = function (nodeId) {
//     var desc = this._getObjectDescriptor(nodeId),
//       self = this;

//     self._logger.debug("activeObject nodeId '" + nodeId + "'");

//     // Remove current territory patterns
//     if (self._currentNodeId) {
//       self._client.removeUI(self._territoryId);
//     }

//     self._currentNodeId = nodeId;
//     self._currentNodeParentId = undefined;

//     if (typeof self._currentNodeId === "string") {
//       // Put new node's info into territory rules
//       self._selfPatterns = {};
//       self._selfPatterns[nodeId] = { children: 0 }; // Territory "rule"

//       self._widget.setTitle(desc.name.toUpperCase());

//       if (typeof desc.parentId === "string") {
//         self.$btnModelHierarchyUp.show();
//       } else {
//         self.$btnModelHierarchyUp.hide();
//       }

//       self._currentNodeParentId = desc.parentId;

//       self._territoryId = self._client.addUI(self, function (events) {
//         self._eventCallback(events);
//       });

//       // Update the territory
//       self._client.updateTerritory(self._territoryId, self._selfPatterns);

//       self._selfPatterns[nodeId] = { children: 1 };
//       self._client.updateTerritory(self._territoryId, self._selfPatterns);
//     }
//   };

//   // This next function retrieves the relevant node information for the widget
//   SimVizControl.prototype._getObjectDescriptor = function (nodeId) {
//     var node = this._client.getNode(nodeId),
//       objDescriptor;
//     if (node) {
//       objDescriptor = {
//         id: node.getId(),
//         name: node.getAttribute(nodePropertyNames.Attributes.name),
//         childrenIds: node.getChildrenIds(),
//         parentId: node.getParentId(),
//         isConnection: GMEConcepts.isConnection(nodeId),
//       };
//     }

//     return objDescriptor;
//   };

//   /* * * * * * * * Node Event Handling * * * * * * * */
//   SimVizControl.prototype._eventCallback = function (events) {
//     var i = events ? events.length : 0,
//       event;

//     this._logger.debug("_eventCallback '" + i + "' items");

//     while (i--) {
//       event = events[i];
//       switch (event.etype) {
//         case CONSTANTS.TERRITORY_EVENT_LOAD:
//           this._onLoad(event.eid);
//           break;
//         case CONSTANTS.TERRITORY_EVENT_UPDATE:
//           this._onUpdate(event.eid);
//           break;
//         case CONSTANTS.TERRITORY_EVENT_UNLOAD:
//           this._onUnload(event.eid);
//           break;
//         default:
//           break;
//       }
//     }

//     this._logger.debug("_eventCallback '" + events.length + "' items - DONE");
//   };

//   SimVizControl.prototype._onLoad = function (gmeId) {
//     var description = this._getObjectDescriptor(gmeId);
//     this._widget.addNode(description);
//   };

//   SimVizControl.prototype._onUpdate = function (gmeId) {
//     var description = this._getObjectDescriptor(gmeId);
//     this._widget.updateNode(description);
//   };

//   SimVizControl.prototype._onUnload = function (gmeId) {
//     this._widget.removeNode(gmeId);
//   };

//   SimVizControl.prototype._stateActiveObjectChanged = function (
//     model,
//     activeObjectId
//   ) {
//     if (this._currentNodeId === activeObjectId) {
//       // The same node selected as before - do not trigger
//     } else {
//       this.selectedObjectChanged(activeObjectId);
//     }
//   };

//   /* * * * * * * * Visualizer life cycle callbacks * * * * * * * */
//   SimVizControl.prototype.destroy = function () {
//     this._detachClientEventListeners();
//     this._removeToolbarItems();
//   };

//   SimVizControl.prototype._attachClientEventListeners = function () {
//     this._detachClientEventListeners();
//     WebGMEGlobal.State.on(
//       "change:" + CONSTANTS.STATE_ACTIVE_OBJECT,
//       this._stateActiveObjectChanged,
//       this
//     );
//   };

//   SimVizControl.prototype._detachClientEventListeners = function () {
//     WebGMEGlobal.State.off(
//       "change:" + CONSTANTS.STATE_ACTIVE_OBJECT,
//       this._stateActiveObjectChanged
//     );
//   };

//   SimVizControl.prototype.onActivate = function () {
//     this._attachClientEventListeners();
//     this._displayToolbarItems();

//     if (typeof this._currentNodeId === "string") {
//       WebGMEGlobal.State.registerActiveObject(this._currentNodeId, {
//         suppressVisualizerFromNode: true,
//       });
//     }
//   };

//   SimVizControl.prototype.onDeactivate = function () {
//     this._detachClientEventListeners();
//     this._hideToolbarItems();
//   };

//   /* * * * * * * * * * Updating the toolbar * * * * * * * * * */
//   SimVizControl.prototype._displayToolbarItems = function () {
//     if (this._toolbarInitialized === true) {
//       for (var i = this._toolbarItems.length; i--; ) {
//         this._toolbarItems[i].show();
//       }
//     } else {
//       this._initializeToolbar();
//     }
//   };

//   SimVizControl.prototype._hideToolbarItems = function () {
//     if (this._toolbarInitialized === true) {
//       for (var i = this._toolbarItems.length; i--; ) {
//         this._toolbarItems[i].hide();
//       }
//     }
//   };

//   SimVizControl.prototype._removeToolbarItems = function () {
//     if (this._toolbarInitialized === true) {
//       for (var i = this._toolbarItems.length; i--; ) {
//         this._toolbarItems[i].destroy();
//       }
//     }
//   };

//   SimVizControl.prototype._initializeToolbar = function () {
//     var self = this,
//       toolBar = WebGMEGlobal.Toolbar;

//     this._toolbarItems = [];

//     this._toolbarItems.push(toolBar.addSeparator());

//     /************** Go to hierarchical parent button ****************/
//     this.$btnModelHierarchyUp = toolBar.addButton({
//       title: "Go to parent",
//       icon: "glyphicon glyphicon-circle-arrow-up",
//       clickFn: function (/*data*/) {
//         WebGMEGlobal.State.registerActiveObject(self._currentNodeParentId);
//       },
//     });
//     this._toolbarItems.push(this.$btnModelHierarchyUp);
//     this.$btnModelHierarchyUp.hide();

//     /************** Checkbox example *******************/

//     this.$cbShowConnection = toolBar.addCheckBox({
//       title: "toggle checkbox",
//       icon: "gme icon-gme_diagonal-arrow",
//       checkChangedFn: function (data, checked) {
//         self._logger.debug("Checkbox has been clicked!");
//       },
//     });
//     this._toolbarItems.push(this.$cbShowConnection);

//     this._toolbarInitialized = true;
//   };

//   return SimVizControl;
// });

/* From StateMachineJoint project shared by professor */
/*globals define, WebGMEGlobal*/
/**
 * Generated by VisualizerGenerator 1.7.0 from webgme on Wed Apr 14 2021 10:39:10 GMT-0500 (Central Daylight Time).
 */

define([
  "js/Constants",
  "js/Utils/GMEConcepts",
  "js/NodePropertyNames",
], function (CONSTANTS, GMEConcepts, nodePropertyNames) {
  "use strict";

  function SimVizControl(options) {
    this._logger = options.logger.fork("Control");

    this._client = options.client;

    // Initialize core collections and variables
    this._widget = options.widget;

    this._currentNodeId = null;

    this._networkRootLoaded = false;

    this._fireableEvents = null;

    this._initWidgetEventHandlers();

    // we need to fix the context of this function as it will be called from the widget directly
    this.setFireableEvents = this.setFireableEvents.bind(this);

    this._logger.debug("ctor finished");
  }

  SimVizControl.prototype._initWidgetEventHandlers = function () {
    this._widget.onNodeClick = function (id) {
      // Change the current active object
      WebGMEGlobal.State.registerActiveObject(id);
    };
  };

  /* * * * * * * * Visualizer content update callbacks * * * * * * * */
  // One major concept here is with managing the territory. The territory
  // defines the parts of the project that the visualizer is interested in
  // (this allows the browser to then only load those relevant parts).
  SimVizControl.prototype.selectedObjectChanged = function (nodeId) {
    var self = this;

    // Remove current territory patterns
    if (self._currentNodeId) {
      self._client.removeUI(self._territoryId);
      self._networkRootLoaded = false; //addme
    }

    self._currentNodeId = nodeId;

    if (typeof self._currentNodeId === "string") {
      // Put new node's info into territory rules
      self._selfPatterns = {};
      self._selfPatterns[nodeId] = { children: 1 }; // Territory "rule"

      self._territoryId = self._client.addUI(self, function (events) {
        self._eventCallback(events);
      });

      // Update the territory
      self._client.updateTerritory(self._territoryId, self._selfPatterns);
    }
  };

  /* * * * * * * * Node Event Handling * * * * * * * */
  SimVizControl.prototype._eventCallback = function (events) {
    const self = this;
    console.log(events);
    events.forEach((event) => {
      if (event.eid && event.eid === self._currentNodeId) {
        if (event.etype == "load" || event.etype == "update") {
          self._networkRootLoaded = true;
        } else {
          self.clearSM();
          return;
        }
      }
    });

    if (
      events.length &&
      events[0].etype === "complete" &&
      self._networkRootLoaded
    ) {
      // complete means we got all requested data and we do not have to wait for additional load cycles
      self._initSM();
    }
  };

  SimVizControl.prototype._stateActiveObjectChanged = function (
    model,
    activeObjectId
  ) {
    if (this._currentNodeId === activeObjectId) {
      // The same node selected as before - do not trigger
    } else {
      this.selectedObjectChanged(activeObjectId);
    }
  };

  /* * * * * * * * Machine manipulation functions * * * * * * * */
  SimVizControl.prototype._initSM = function () {
    const self = this;
    //just for the ease of use, lets create a META dictionary
    const rawMETA = self._client.getAllMetaNodes();
    const META = {};
    rawMETA.forEach((node) => {
      META[node.getAttribute("name")] = node.getId(); //we just need the id...
    });
    //now we collect all data we need for network visualization
    //we need our states (names, position, type), need the set of next state (with event names)
    const smNode = self._client.getNode(self._currentNodeId);
    const elementIds = smNode.getChildrenIds();
    const sm = { init: null, states: {} };
    elementIds.forEach((elementId) => {
      const node = self._client.getNode(elementId);
      // the simple way of checking type
      if (node.isTypeOf(META["State"])) {
        //right now we only interested in states...
        const state = {
          name: node.getAttribute("name"),
          next: {},
          position: node.getRegistry("position"),
          isEnd: node.isTypeOf(META["End"]),
        };
        // one way to check meta-type in the client context - though it does not check for generalization types like State
        if (
          "Init" ===
          self._client.getNode(node.getMetaTypeId()).getAttribute("name")
        ) {
          sm.init = elementId;
        }

        // this is in no way optimal, but shows clearly what we are looking for when we collect the data
        elementIds.forEach((nextId) => {
          const nextNode = self._client.getNode(nextId);
          if (
            nextNode.isTypeOf(META["Transition"]) &&
            nextNode.getPointerId("src") === elementId
          ) {
            state.next[nextNode.getAttribute("event")] =
              nextNode.getPointerId("dst");
          }
        });
        sm.states[elementId] = state;
      }
    });
    sm.setFireableEvents = this.setFireableEvents;

    self._widget.initMachine(sm);
  };

  SimVizControl.prototype.clearSM = function () {
    const self = this;
    self._networkRootLoaded = false;
    self._widget.destroyMachine();
  };

  SimVizControl.prototype.setFireableEvents = function (events) {
    this._fireableEvents = events;
    if (events && events.length > 1) {
      // we need to fill the dropdow button with options
      this.$btnEventSelector.clear();
      events.forEach((event) => {
        this.$btnEventSelector.addButton({
          text: event,
          title: "fire event: " + event,
          data: { event: event },
          clickFn: (data) => {
            this._widget.fireEvent(data.event);
          },
        });
      });
    } else if (events && events.length === 0) {
      this._fireableEvents = null;
    }

    this._displayToolbarItems();
  };

  /* * * * * * * * Visualizer life cycle callbacks * * * * * * * */
  SimVizControl.prototype.destroy = function () {
    this._detachClientEventListeners();
    this._removeToolbarItems();
  };

  SimVizControl.prototype._attachClientEventListeners = function () {
    this._detachClientEventListeners();
    WebGMEGlobal.State.on(
      "change:" + CONSTANTS.STATE_ACTIVE_OBJECT,
      this._stateActiveObjectChanged,
      this
    );
  };

  SimVizControl.prototype._detachClientEventListeners = function () {
    WebGMEGlobal.State.off(
      "change:" + CONSTANTS.STATE_ACTIVE_OBJECT,
      this._stateActiveObjectChanged
    );
  };

  SimVizControl.prototype.onActivate = function () {
    this._attachClientEventListeners();
    this._displayToolbarItems();

    if (typeof this._currentNodeId === "string") {
      WebGMEGlobal.State.registerActiveObject(this._currentNodeId, {
        suppressVisualizerFromNode: true,
      });
    }
  };

  SimVizControl.prototype.onDeactivate = function () {
    this._detachClientEventListeners();
    this._hideToolbarItems();
  };

  /* * * * * * * * * * Updating the toolbar * * * * * * * * * */
  SimVizControl.prototype._displayToolbarItems = function () {
    if (this._toolbarInitialized === true) {
      for (var i = this._toolbarItems.length; i--; ) {
        this._toolbarItems[i].show();
      }
      if (this._fireableEvents === null) {
        this.$btnEventSelector.hide();
        this.$btnSingleEvent.hide();
      } else if (this._fireableEvents.length == 1) {
        this.$btnEventSelector.hide();
      } else {
        this.$btnSingleEvent.hide();
      }
    } else {
      this._initializeToolbar();
    }
  };

  SimVizControl.prototype._hideToolbarItems = function () {
    if (this._toolbarInitialized === true) {
      for (var i = this._toolbarItems.length; i--; ) {
        this._toolbarItems[i].hide();
      }
    }
  };

  SimVizControl.prototype._removeToolbarItems = function () {
    if (this._toolbarInitialized === true) {
      for (var i = this._toolbarItems.length; i--; ) {
        this._toolbarItems[i].destroy();
      }
    }
  };

  SimVizControl.prototype._initializeToolbar = function () {
    var self = this,
      toolBar = WebGMEGlobal.Toolbar;

    this._toolbarItems = [];

    this._toolbarItems.push(toolBar.addSeparator());

    /************** Go to hierarchical parent button ****************/
    this.$btnReachCheck = toolBar.addButton({
      title: "Check state machine reachability properties",
      icon: "glyphicon glyphicon-question-sign",
      clickFn: function (/*data*/) {
        const context = self._client.getCurrentPluginContext(
          "ReachCheck",
          self._currentNodeId,
          []
        );
        // !!! it is important to fill out or pass an empty object as the plugin config otherwise we might get errors...
        context.pluginConfig = {};
        self._client.runServerPlugin(
          "PetriNetCategorizer",
          context,
          function (err, result) {
            // here comes any additional processing of results or potential errors.
            console.log("plugin err:", err);
            console.log("plugin result:", result);
          }
        );
      },
    });
    this._toolbarItems.push(this.$btnReachCheck);

    this.$btnResetMachine = toolBar.addButton({
      title: "Reset simulator",
      icon: "glyphicon glyphicon-fast-backward",
      clickFn: function (/*data*/) {
        self._widget.resetMachine();
      },
    });
    this._toolbarItems.push(this.$btnResetMachine);

    // when there are multiple events to choose from we offer a selector
    this.$btnEventSelector = toolBar.addDropDownButton({
      text: "event",
    });
    this._toolbarItems.push(this.$btnEventSelector);
    this.$btnEventSelector.hide();

    // if there is only one event we just show a play button
    this.$btnSingleEvent = toolBar.addButton({
      title: "Fire event",
      icon: "glyphicon glyphicon-play",
      clickFn: function (/*data*/) {
        self._widget.fireEvent(self._fireableEvents[0]);
      },
    });
    this._toolbarItems.push(this.$btnSingleEvent);

    /************** Dropdown for event progression *******************/

    this._toolbarInitialized = true;
  };

  return SimVizControl;
});
