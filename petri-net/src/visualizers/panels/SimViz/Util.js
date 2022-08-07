/*********** UTILITY FUNCTIONS *************/
let getMetaName = (client, node) => {
  let metaTypeId = node.getMetaTypeId();
  return client.getNode(metaTypeId).getAttribute("name");
};

let getArcs = (client, metaName, elementIds) => {
  // metaName = 'ArcPlaceToTransition' or 'ArcTransitionToPlace'
  let arcs = [];
  elementIds.forEach((id, i) => {
    let node = client.getNode(id);
    if (getMetaName(client, node) === metaName) {
      arcs.push({
        id: id,
        name: node.getAttribute("name"),
        src: getArcPointerNodeId(node, "src"),
        dst: getArcPointerNodeId(node, "dst"),
      });
    }
  });
  return arcs;
};

let getPlacesIds = (client, elementIds) => {
  // get the ids of places from the children
  let places = [];
  elementIds.forEach((id, i) => {
    let node = client.getNode(id);
    if (getMetaName(client, node) === "Place") {
      places.push(id);
    }
  });
  return places;
};

let getTransitionsIds = (client, elementIds) => {
  // get the ids of transitions from the children
  let transitions = [];
  elementIds.forEach((id, i) => {
    let node = client.getNode(id);
    if (getMetaName(client, node) === "Transition") {
      transitions.push(id);
    }
  });
  return transitions;
};

let getOutputMatrix = (placeIds, transitionIds, arcsPlaceToTransition) => {
  // build object representing out flow from each place to each transition {'place1': {'trans1id': 0, 'trans2id': 1, 'trans3id': 0}, ...}
  let outputMatrix = {};
  placeIds.forEach((pid, i) => {
    outputMatrix[pid] = {};
    transitionIds.forEach((tid, j) => {
      outputMatrix[pid][tid] = getOutFlowFromPlaceToTransition(
        pid,
        tid,
        arcsPlaceToTransition
      );
    });
  });
  return outputMatrix;
};

let getInputMatrix = (placeIds, transitionIds, arcsTransitionToPlace) => {
  // build object representing in flow to each place from each transition e.g. {'place1': {'trans1id': 0, 'trans2id': 1, 'trans3id': 0}, ...}
  let inputMatrix = {};
  placeIds.forEach((pid, i) => {
    inputMatrix[pid] = {};
    transitionIds.forEach((tid, j) => {
      inputMatrix[pid][tid] = getInFlowToPlaceFromTransition(
        pid,
        tid,
        arcsTransitionToPlace
      );
    });
  });
  return inputMatrix;
};

let getArcPointerNodeId = (arc, pointerName) => {
  // return id of node being pointed at where pointerName is either 'src' or 'dst'
  return arc.getPointerId(pointerName);
};
let getOutFlowFromPlaceToTransition = (
  placeId,
  transitionId,
  arcsPlaceToTransition
) => {
  // return true if arc from placeId to transitionId else false
  return arcsPlaceToTransition.some((arc, index) => {
    return arc.src === placeId && arc.dst === transitionId;
  });
};
let getInFlowToPlaceFromTransition = (
  placeId,
  transitionId,
  arcsTransitionToPlace
) => {
  // return true if arc to placeId from transitionId else false
  return arcsTransitionToPlace.some((arc, index) => {
    return arc.src === transitionId && arc.dst === placeId;
  });
};
let placeHasNoFlow = (matrix, placeId) => {
  // obj is either input or output matrix
  // return true if all of the values for the corresponding transitions are false
  return Object.entries(matrix[placeId]).every((arr) => {
    return !arr[1];
  });
};

let getStartingPlaceId = (inputMatrix) => {
  // the first place is the place with no in flow and only out flow.
  for (const placeId in inputMatrix) {
    if (placeHasNoFlow(inputMatrix, placeId)) {
      return placeId;
    }
  }
  // if there is no place with no inflow, then use any of the places as starting point
  for (const placeId in inputMatrix) {
    return placeId;
  }
};

let getNextPlacesFromCurrentPlace = (
  placeId,
  arcsPlaceToTransition,
  arcsTransitionToPlace
) => {
  let nextPlaces = [];
  let outFlowArcs = arcsPlaceToTransition.filter((arc) => arc.src === placeId);
  outFlowArcs.forEach((arc_p2t) => {
    nextPlaces.push(
      ...arcsTransitionToPlace
        .filter((arc_t2p) => arc_t2p.src === arc_p2t.dst)
        .map((arc_t2p) => {
          // do not include already traversed in case of loops
          if (arc_t2p.src === arc_p2t.dst) {
            return arc_t2p.dst;
          }
        })
    );
  });
  return nextPlaces;
};

let getOutTransitionsFromPlace = (placeId, outputMatrix) => {
  return Object.keys(outputMatrix[placeId]).filter(
    (transId) => outputMatrix[placeId][transId]
  );
};
let getInTransitionsToPlace = (placeId, inputMatrix) => {
  return Object.keys(inputMatrix[placeId]).filter(
    (transId) => inputMatrix[placeId][transId]
  );
};
let getInPlacesToTransition = (transId, outputMatrix) => {
  return Object.keys(outputMatrix).filter(
    (placeId) => outputMatrix[placeId][transId]
  );
};
let getOutPlacesFromTransition = (transId, inputMatrix) => {
  return Object.keys(inputMatrix).filter(
    (placeId) => inputMatrix[placeId][transId]
  );
};

let getOutArcsFromPlace = (placeId, arcsPlaceToTransition) => {
  return arcsPlaceToTransition.filter((arc) => arc.src === placeId);
};
let getOutArcsFromTransition = (transitionId, arcsTransitionToPlace) => {
  return arcsTransitionToPlace.filter((arc) => arc.src === transitionId);
};
/*********** END UTILITY FUNCTIONS *************/
