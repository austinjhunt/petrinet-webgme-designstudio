define([
  "js/Constants",
  "js/Utils/GMEConcepts",
  "js/NodePropertyNames",
  "./Util",
], function (CONSTANTS, GMEConcepts, nodePropertyNames) {
  "use strict";
  function SimVizControl(options) {
    this._logger = options.logger.fork("Control");
    this._client = options.client;
    // Initialize core collections and variables
    this._widget = options.widget;
    this._widget._client = options.client;

    this._currentNodeId = null;
    this._fireableEvents = null;
    this._networkRootLoaded = false;
    this._initWidgetEventHandlers();
    // we need to fix the context of this function as it will be called from the widget directly
    this.setFireableEvents = this.setFireableEvents.bind(this);
    console.log("end control constructor");
    this._logger.debug("ctor finished");
  }

  SimVizControl.prototype._initWidgetEventHandlers = function () {
    console.log("init widget event handlers");
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
    // console.log(events);
    events.forEach((event) => {
      if (event.eid && event.eid === self._currentNodeId) {
        if (event.etype == "load" || event.etype == "update") {
          self._networkRootLoaded = true;
        } else {
          self.clearPetriNet();
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
      self._initPetriNet();
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
  SimVizControl.prototype._initPetriNet = function () {
    const rawMETA = this._client.getAllMetaNodes();
    const META = {};
    const self = this;
    rawMETA.forEach((node) => {
      META[node.getAttribute("name")] = node.getId(); //we just need the id...
    });
    const petriNetNode = this._client.getNode(this._currentNodeId);
    const elementIds = petriNetNode.getChildrenIds();
    let placeIds = getPlacesIds(this._client, elementIds);
    let transitionIds = getTransitionsIds(this._client, elementIds);
    let arcsTransitionToPlace = getArcs(
      self._client,
      "ArcTransitionToPlace",
      elementIds
    );
    let arcsPlaceToTransition = getArcs(
      self._client,
      "ArcPlaceToTransition",
      elementIds
    );
    let inputMatrix = getInputMatrix(
      placeIds,
      transitionIds,
      arcsTransitionToPlace
    );
    let startingPlaceId = getStartingPlaceId(inputMatrix);
    let outputMatrix = getOutputMatrix(
      placeIds,
      transitionIds,
      arcsPlaceToTransition
    );
    let petriNet = {
      /* functions to pass logic to widget */
      deadlockActive: _petriNetInDeadlock,
      /* end functions */
      startingPlace: startingPlaceId,
      places: {},
      transitions: {},
      inputMatrix: inputMatrix,
      outputMatrix: outputMatrix,
      arcsPlaceToTransition: arcsPlaceToTransition,
      arcsTransitionToPlace: arcsTransitionToPlace,
    };
    elementIds.forEach((elementId) => {
      const node = self._client.getNode(elementId);
      if (node.isTypeOf(META["Place"])) {
        petriNet.places[elementId] = {
          id: elementId,
          name: node.getAttribute("name"),
          currentMarking: parseInt(node.getAttribute("currentMarking")),
          nextPlaceIds: getNextPlacesFromCurrentPlace(
            elementId,
            arcsPlaceToTransition,
            arcsTransitionToPlace
          ),
          outTransitions: getOutTransitionsFromPlace(elementId, outputMatrix),
          inTransitions: getInTransitionsToPlace(elementId, inputMatrix),
          outArcs: getOutArcsFromPlace(elementId, arcsPlaceToTransition),
          position: node.getRegistry("position"),
        };
      } else if (node.isTypeOf(META["Transition"])) {
        petriNet.transitions[elementId] = {
          id: elementId,
          name: node.getAttribute("name"),
          outPlaces: getOutPlacesFromTransition(elementId, inputMatrix),
          inPlaces: getInPlacesToTransition(elementId, outputMatrix),
          outArcs: getOutArcsFromTransition(elementId, arcsTransitionToPlace),
          position: node.getRegistry("position"),
        };
      }
    });
    petriNet.setFireableEvents = this.setFireableEvents;
    self._widget.initMachine(petriNet);
  };

  SimVizControl.prototype.clearPetriNet = function () {
    this._networkRootLoaded = false;
    this._widget.destroyMachine();
  };

  SimVizControl.prototype.setFireableEvents = function (enabledTransitions) {
    this._fireableEvents = enabledTransitions;
    console.log("setFireableEvents:enabledTransitions:");
    console.log(enabledTransitions);
    if (enabledTransitions && enabledTransitions.length >= 1) {
      // fill dropdown button with options. only including enabled transitions
      this.$btnEventSelector.clear();
      enabledTransitions.forEach((transition) => {
        this.$btnEventSelector.addButton({
          text: `Fire enabled transition ${transition.name}`,
          title: `Fire enabled transition ${transition.name}`,
          data: { event: transition },
          clickFn: (data) => {
            this._widget.fireEvent(data.event);
          },
        });
      });
    } else if (enabledTransitions && enabledTransitions.length === 0) {
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
    const self = this;
    self._detachClientEventListeners();
    WebGMEGlobal.State.on(
      "change:" + CONSTANTS.STATE_ACTIVE_OBJECT,
      self._stateActiveObjectChanged,
      self
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
      if (this._fireableEvents === null || this._fireableEvents.length == 0) {
        this.$btnSingleEvent.hide();
        this.$btnEventSelector.hide();
        this.$deadlockLabel.show();
        this.$btnResetMachine.hide();
      } else {
        this.$btnSingleEvent.show();
        this.$btnEventSelector.show();
        this.$btnResetMachine.show();
        this.$deadlockLabel.hide();
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
    var toolBar = WebGMEGlobal.Toolbar;
    const self = this;
    self._toolbarItems = [];
    self._toolbarItems.push(toolBar.addSeparator());

    //
    self.$btnPetriNetClassifier = toolBar.addButton({
      text: "Classify! ",
      title: "Classify this petri net",
      icon: "glyphicon glyphicon-question-sign",
      clickFn: function (/*data*/) {
        const context = self._client.getCurrentPluginContext(
          "PetriNetClassifier",
          self._currentNodeId,
          []
        );
        // !!! it is important to fill out or pass an empty object as the plugin config otherwise we might get errors...
        context.pluginConfig = {};
        self._client.runServerPlugin(
          "PetriNetClassifier",
          context,
          function (err, result) {
            // here comes any additional processing of results or potential errors.
            console.log("plugin err:", err);
            console.log("plugin result:", result);
          }
        );
      },
    });
    self._toolbarItems.push(self.$btnPetriNetClassifier);

    self.$btnResetMachine = toolBar.addButton({
      title: "Reset simulator",
      text: "Reset simulator  ",
      icon: "glyphicon glyphicon-fast-backward",
      clickFn: function (/*data*/) {
        self._widget.resetMachine();
      },
    });
    self._toolbarItems.push(self.$btnResetMachine);

    // when there are multiple enabled transitions to choose
    // from we offer a selector
    self.$btnEventSelector = toolBar.addDropDownButton({
      text: "Fire a specific enabled transition  ",
      title: "Fire a specific enabled transition",
      icon: "glyphicon glyphicon-play",
    });
    self._toolbarItems.push(self.$btnEventSelector);
    self.$btnEventSelector.hide();

    // play button for firing ALL enabled transitions
    self.$btnSingleEvent = toolBar.addButton({
      text: "Fire all enabled transitions!  ",
      title: "Fire all enabled transitions",
      data: { event: "FIRE" },
      icon: "glyphicon glyphicon-play",
      clickFn: (data) => {
        self._widget.fireEvent(); // no args to fire all
      },
    });
    self._toolbarItems.push(self.$btnSingleEvent);
    self.$btnSingleEvent.hide();

    // play button for firing ALL enabled transitions
    self.$deadlockLabel = toolBar.addLabel();
    self.$deadlockLabel.text("DEADLOCK (NO ENABLED TRANSITIONS)");
    self._toolbarItems.push(self.$deadlockLabel);
    self.$deadlockLabel.hide();
    /************** Dropdown for event progression *******************/
    self._toolbarInitialized = true;
  };

  return SimVizControl;
});
