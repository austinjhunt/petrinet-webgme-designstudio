"""
This is where the implementation of the plugin code goes.
The PetriNetCategorizer-class is imported from both run_plugin.py and run_debug.py

This plugin is used to determine which classifications a given PetriNet belongs to.
It can belong to multiple. Classification is obtained through traversal of the network.

Below is a list of the possibile classifications for petri nets (they are documented in
the methods)
- Free-choice petri net
- State machine
- Marked graph​
- Workflow net

"""
import sys
import logging
from webgme_bindings import PluginBase

# Setup a logger
logger = logging.getLogger('PetriNetCategorizer')
logger.setLevel(logging.INFO)
handler = logging.StreamHandler(sys.stdout)  # By default it logs to stderr..
handler.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)

class PetriNetCategorizer(PluginBase): 
    def get_paths_to_nodes(self, nodes=[]):
        """ return a dictionary containing all node
        paths as keys and the respective nodes as their values. """
        return {
                self.core.get_path(node): node \
                    for node in nodes
                }

    def get_arc_pointer_node_id(self, arc, pointer_name):
        """ return id (path) of node being pointed at by arc
        where pointer name is either 'src' or 'dst'"""
        return self.core.get_pointer_path(arc, pointer_name)

    def is_place(self, node):
        """ return true if node is a Place, false otherwise """
        return self.core.is_instance_of(node, self.META['Place'])

    def is_transition(self, node):
        """ return true if node is a Transition, false otherwise """
        return self.core.is_instance_of(node, self.META['Transition'])

    def is_arc_transition_to_place(self, node):
        """ return true if node is an ArcTransitionToPlace, false otherwise """
        return self.core.is_instance_of(
            node, self.META['ArcTransitionToPlace'])

    def is_arc_of_type(self, arc, arc_type):
        """ return true if arc is of type arc_type where arc_type is either
        'ArcPlaceToTransition' or 'ArcTransitionToPlace'
        """
        return self.is_arc_place_to_transition(arc) if \
             arc_type == 'ArcPlaceToTransition' else \
                self.is_arc_transition_to_place(arc)

    def is_arc_place_to_transition(self, node):
        """ return true if node is an ArcPlaceToTransition, false otherwise """
        return self.core.is_instance_of(
            node, self.META['ArcPlaceToTransition'])

    def get_places(self):
        return [p for p in self.nodes if self.is_place(p)]

    def get_place_ids(self):
        return [self.core.get_path(p) for p in self.get_places()]

    def get_transitions(self):
        return [t for t in self.nodes if self.is_transition(t)]

    def get_transition_ids(self):
        return [self.core.get_path(t) for t in self.get_transitions()]

    def get_arcs(self, arc_type):
        return [arc for arc in self.nodes if \
            self.is_arc_of_type(arc, arc_type)]

    def get_next_places_from_current_place(self, place_id):
        """ return a list of next places from the current
        place, where a next place is a place that is the
        destination of an ArcTransitionToPlace whose src
        is a Transition that is the dst of a
        ArcPlaceToTransition with src = placeId """
        next_places = []
        outflow_arcs = filter(lambda arc: arc.src == place_id,
            self.arcs_place_to_transition)
        for arc_p2t in outflow_arcs:
            next_places.extend([
                # we are interested in the next places
                # which are .dst of transition to place arcs
                # matching our criteria
                arc_t2p.dst for arc_t2p in \
                # filter out the transition to place arcs
                # whose transition src is the transition dest
                # of current arc
                filter(
                    lambda arc_t2p: arc_t2p.src == arc_p2t.dst,
                    self.arcs_transition_to_place) \
                        # do not include already traversed
                        # in case of loops
                        if arc_t2p.src == arc_p2t.dst
                ])
        return next_places

    def get_in_flow_to_place_from_transition(
        self,place_id, transition_id):
        """ return true if arc to placeId from transitionId
        else false """
        return any(
            arc.src == transition_id and \
            arc.dst == place_id for arc in \
                self.arcs_transition_to_place)

    def get_out_flow_from_place_to_transition(
        self,place_id, transition_id):
        """ return true if arc from placeId to transitionId
        else false """
        return any(
            arc.src == place_id and \
                arc.dst == transition_id for arc in \
                self.arcs_place_to_transition)

    def get_input_matrix(self):
        """
        build object representing in flow to each place from
        each transition e.g.
        {
            'place1': {
                'trans1id': 0,
                'trans2id': 1,
                'trans3id': 0
                },
                ...
        }
        """
        input_matrix = {}
        for place_id in self.get_place_ids():
            input_matrix[place_id] = {}
            for transition_id in self.get_transition_ids():
                input_matrix[place_id][transition_id] = \
                    self.get_in_flow_to_place_from_transition(
                        place_id, transition_id
                    )
        return input_matrix

    def get_output_matrix(self):
        """ build object representing out flow from each
        place to each transition
        {
            'place1': {
                'trans1id': 0
                'trans2id': 1,
                'trans3id': 0
                },
                ...
        }
        """
        output_matrix = {}
        for place_id in self.get_place_ids():
            output_matrix[place_id] = {}
            for transition_id in self.get_transition_ids():
                output_matrix[place_id][transition_id] = \
                    self.get_in_flow_to_place_from_transition(
                        place_id, transition_id
                    )
        return output_matrix

    def is_free_choice(self, petri_net=None):
        """ return true if petri net is a free choice petri net,
        false otherwise.
        If the intersection of the inplaces sets of two transitions
        are not empty, then the two transitions should be the same
        (or in short, each transition has its own unique set if ​inplaces).
        No two distinct transitions should share an inplace. ​ """
        pass

    def is_marked_graph(self, petri_net=None):
        """ return true if petri net is a marked graph petri net,
        false otherwise.
        A petri net is a marked graph if every place has exactly
        one out transition and one in transition. """
        pass

    def get_all_out_transitions_from_place(self, place_id):
        """ use the output matrix to get all of the 
        out transitions from this place id"""
        return [tid for tid, val in \
            self.output_matrix[place_id].items() if val]
    
    def get_all_in_transitions_to_place(self, place_id):
        """ use the input matrix to get all 
        of the in transitions to this place id """
        return [tid for tid, val in \
            self.input_matrix[place_id].items() if val]

    def get_all_in_places_to_transition(self, transition_id):
        """ use the output matrix to get all of the 
        places with this transition as an out transition """
        return [
            p for p, transitions in self.output_matrix.items() if \
                transitions[transition_id]
        ]

    def get_all_out_places_from_transition(self, transition_id): 
        """ use the input matrix to get all of the places
        with this transition as an in transition """
        return [
            p for p, transitions in self.input_matrix.items() if \
                transitions[transition_id]
        ]

    def is_workflow(self):
        """ return true if petri net is a workflow petri net,
        false otherwise.
        A petri net is a workflow net if it has exactly one
        source place s where inflow of s is empty set, one sink
        place o where outflow of o is empty set, and every
        x∈P∪T is on a path from s to o """

        def _get_places_with_no_inflow():
            """ Helper method to collect all places with no inflow / in transitions.
            these are possible sources in a workflow. """
            places_no_inflow = []
            for place_id, transition_inflows in self.input_matrix:
                if not any(transition_inflows[tif] for tif, i in enumerate(transition_inflows)):
                    places_no_inflow.append(place_id)
            return places_no_inflow

        def _get_places_with_no_outflow():
            """ Helper method to collect all places with no outflow / out transitions.
            these are possible sinks in a workflow. """
            places_no_outflow = []
            for place_id, transition_outflows in self.output_matrix:
                if not any(transition_outflows[tif] for tif, i in enumerate(transition_outflows)):
                    places_no_outflow.append(place_id)
            return places_no_outflow
        # one place is technically a workflow.
        if len(self.places) == 1:
            return True 

        no_inflow_places, no_outflow_places = _get_places_with_no_inflow(), _get_places_with_no_outflow()
        if len(no_inflow_places) == 1 and len(no_outflow_places) == 1:
            src, sink = no_inflow_places[0], no_outflow_places[0]
            # now need to make sure every x ∈ P ∪ T is on path from src to sink.
            # can create one list union of all places and transitions, and traverse from src to sink
            # and remove items from the union until reaching sink. if items still left, not a workflow.
            # if empty, workflow.
            all_places_and_transitions = self.get_place_ids().extend(self.get_transition_ids())
            
            # breadth first
            queue = [src]
            while queue:
                node_id = queue.pop(0) 
                all_places_and_transitions.remove(node_id)
                node = self.core.load_by_path(
                    self.active_node, 
                    self.convert_path_to_relative(node_id)
                    )
                if self.is_place(node):
                    out = self.get_all_out_transitions_from_place(
                        place_id=node_id
                        ) 
                elif self.is_transition(node):
                    out = self.get_all_out_places_from_transition(
                        transition_id=node_id
                    )
                queue.extend(out)
            if all_places_and_transitions:
                logger.info(f'| T U P | = {len(all_places_and_transitions)}')
                logger.info(
                    f'Not all elements of that set are on path '
                    f'from src {src} to sink {sink}'
                    )
                return False 
            else: 
                return True 
        else:
            # source count or sink count != exactly 1 
            return False

    def convert_path_to_relative(self, node_path):
        """ return relative path of node based on current active_node
        by removing the active node path from beginning of node's path """
        return node_path.replace(self.active_node['nodePath'], '')

    def get_node_from_path(self, node_path):
        """ given a node path / ID, return its name """
        node = self.core.load_by_path(self.active_node, self.convert_path_to_relative(node_path))
        return self.core.get_attribute(node, 'name')


    def is_state_machine(self):
        """ return true if petri net is a state machine petri net,
        false otherwise.
        A petri net is a state machine if every transition has
        exactly one ​inplace and one ​outplace​.
         """
        pass


    def main(self):
        self.nodes = self.core.load_own_sub_tree(self.active_node)
        self.node_paths = self.get_paths_to_nodes(nodes=self.nodes)
        
        core = self.core
        root_node = self.root_node
        active_node = self.active_node
        self.places = self.get_places()
        self.transitions = self.get_transitions()
        self.arcs_place_to_transition = self.get_arcs(
            arc_type='ArcPlaceToTransition'
            )
        self.arcs_transition_to_place = self.get_arcs(
            arc_type='ArcTransitionToPlace'
        )
        self.input_matrix = self.get_input_matrix()
        self.output_matrix = self.get_output_matrix()
        META = self.META
        active_node = self.active_node # we assume that the active node is the petri net node
        name = core.get_attribute(active_node, 'name')
        logger.info(
            f'ActiveNode at {core.get_path(active_node)}'
            f'has name {name}'
            )
        core.set_attribute(active_node, 'name', 'newName')
        commit_info = self.util.save(
            root_node, 
            self.commit_hash, 
            'master', 
            'Python plugin updated the model')
        logger.info(f'committed :{commit_info}')

        if self.is_workflow():
            self.send_notification('WORKFLOW')
