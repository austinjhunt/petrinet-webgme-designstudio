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
    rawMETA.forEach((node) => {
      META[node.getAttribute("name")] = node.getId(); //we just need the id...
    });
    const petriNetNode = this._client.getNode(this._currentNodeId);
    const elementIds = petriNetNode.getChildrenIds();
    let placeIds = getPlacesIds(this._client, elementIds);
    let transitionIds = getTransitionsIds(this._client, elementIds);
    let arcsTransitionToPlace = getArcs(
      this._client,
      "ArcTransitionToPlace",
      elementIds
    );
    let arcsPlaceToTransition = getArcs(
      this._client,
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
      startingPlaceId: startingPlaceId,
      places: {},
      placeIds: placeIds,
      transitionIds: transitionIds,
      inputMatrix: inputMatrix,
      outputMatrix: outputMatrix,
      arcsPlaceToTransition: arcsPlaceToTransition,
      arcsTransitionToPlace: arcsTransitionToPlace,
    };
    elementIds.forEach((elementId) => {
      const node = this._client.getNode(elementId);
      if (node.isTypeOf(META["Place"])) {
        petriNet.places[elementId] = {
          name: node.getAttribute("name"),
          initialMarking: parseInt(node.getAttribute("currentMarking")),
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
      }
    });
    petriNet.setFireableEvents = this.setFireableEvents;
    this._widget.initMachine(petriNet);
  };

  SimVizControl.prototype.clearPetriNet = function () {
    this._networkRootLoaded = false;
    this._widget.destroyMachine();
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
    var toolBar = WebGMEGlobal.Toolbar;
    this._toolbarItems = [];
    this._toolbarItems.push(toolBar.addSeparator());

    /************** Go to hierarchical parent button ****************/
    this.$btnReachCheck = toolBar.addButton({
      title: "Check state machine reachability properties",
      icon: "glyphicon glyphicon-question-sign",
      clickFn: function (/*data*/) {
        const context = this._client.getCurrentPluginContext(
          "PetriNetClassifier",
          this._currentNodeId,
          []
        );
        // !!! it is important to fill out or pass an empty object as the plugin config otherwise we might get errors...
        context.pluginConfig = {};
        this._client.runServerPlugin(
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
    this._toolbarItems.push(this.$btnReachCheck);

    this.$btnResetMachine = toolBar.addButton({
      title: "Reset simulator",
      icon: "glyphicon glyphicon-fast-backward",
      clickFn: function (/*data*/) {
        this._widget.resetMachine();
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
        this._widget.fireEvent(this._fireableEvents[0]);
      },
    });
    this._toolbarItems.push(this.$btnSingleEvent);
    /************** Dropdown for event progression *******************/
    this._toolbarInitialized = true;
  };

  return SimVizControl;
});
