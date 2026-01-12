#!/usr/bin/env python3
"""
BPMN 2.0 XML Validator

Validates BPMN 2.0 XML files for common structural issues.
"""

import xml.etree.ElementTree as ET
import sys
from pathlib import Path

# BPMN namespaces
NAMESPACES = {
    'bpmn': 'http://www.omg.org/spec/BPMN/20100524/MODEL',
    'bpmndi': 'http://www.omg.org/spec/BPMN/20100524/DI',
    'omgdc': 'http://www.omg.org/spec/DD/20100524/DC',
    'omgdi': 'http://www.omg.org/spec/DD/20100524/DI'
}


class BPMNValidator:
    def __init__(self, filepath):
        self.filepath = Path(filepath)
        self.errors = []
        self.warnings = []
        self.tree = None
        self.root = None
        self.element_ids = set()
        self.flow_nodes = set()
        self.sequence_flows = {}
        
    def validate(self):
        """Run all validation checks"""
        print(f"Validating BPMN file: {self.filepath}")
        print("=" * 60)
        
        # Parse XML
        if not self._parse_xml():
            return False
            
        # Run validation checks
        self._check_namespaces()
        self._check_root_element()
        self._collect_elements()
        self._check_flow_references()
        self._check_di_completeness()
        self._check_event_flows()
        self._check_gateway_flows()
        
        # Report results
        self._report_results()
        
        return len(self.errors) == 0
    
    def _parse_xml(self):
        """Parse the XML file"""
        try:
            self.tree = ET.parse(self.filepath)
            self.root = self.tree.getroot()
            return True
        except ET.ParseError as e:
            self.errors.append(f"XML Parse Error: {e}")
            return False
        except FileNotFoundError:
            self.errors.append(f"File not found: {self.filepath}")
            return False
    
    def _check_namespaces(self):
        """Verify required namespaces are declared"""
        required_ns = ['bpmn', 'bpmndi', 'omgdc', 'omgdi']
        
        # Get all namespaces from root attributes
        root_ns = {}
        for key, value in self.root.attrib.items():
            if 'xmlns' in key:
                root_ns[value] = True
        
        # Also check if namespace is used as default (xmlns without prefix)
        if self.root.tag.startswith('{'):
            default_ns = self.root.tag.split('}')[0][1:]
            root_ns[default_ns] = True
        
        for prefix in required_ns:
            ns_uri = NAMESPACES[prefix]
            if ns_uri not in root_ns:
                self.warnings.append(f"Namespace may not be declared: {prefix} ({ns_uri})")
    
    def _check_root_element(self):
        """Check root element is definitions"""
        if not self.root.tag.endswith('definitions'):
            self.errors.append(f"Root element should be 'definitions', found: {self.root.tag}")
    
    def _collect_elements(self):
        """Collect all element IDs and flow nodes"""
        # Collect all elements with IDs
        for elem in self.root.iter():
            elem_id = elem.get('id')
            if elem_id:
                if elem_id in self.element_ids:
                    self.errors.append(f"Duplicate ID found: {elem_id}")
                self.element_ids.add(elem_id)
                
                # Track flow nodes
                if any(elem.tag.endswith(t) for t in ['startEvent', 'endEvent', 'task', 'userTask', 
                                                       'serviceTask', 'scriptTask', 'manualTask',
                                                       'sendTask', 'receiveTask', 'subProcess',
                                                       'exclusiveGateway', 'parallelGateway', 
                                                       'inclusiveGateway', 'eventBasedGateway',
                                                       'intermediateCatchEvent', 'intermediateThrowEvent']):
                    self.flow_nodes.add(elem_id)
        
        # Collect sequence flows
        for flow in self.root.iter():
            if flow.tag.endswith('sequenceFlow'):
                flow_id = flow.get('id')
                source = flow.get('sourceRef')
                target = flow.get('targetRef')
                self.sequence_flows[flow_id] = {'source': source, 'target': target}
    
    def _check_flow_references(self):
        """Check that all flow references are valid"""
        # Check incoming/outgoing references
        for node in self.root.iter():
            if node.tag.endswith(('incoming', 'outgoing')):
                ref = node.text
                if ref and ref not in self.sequence_flows:
                    self.errors.append(f"Flow reference not found: {ref} in {node.tag}")
        
        # Check flowNodeRef references
        for ref in self.root.iter():
            if ref.tag.endswith('flowNodeRef'):
                node_id = ref.text
                if node_id and node_id not in self.flow_nodes:
                    self.errors.append(f"Flow node reference not found: {node_id}")
        
        # Check sourceRef/targetRef in sequence flows
        for flow_id, refs in self.sequence_flows.items():
            if refs['source'] and refs['source'] not in self.element_ids:
                self.errors.append(f"Sequence flow {flow_id} sourceRef not found: {refs['source']}")
            if refs['target'] and refs['target'] not in self.element_ids:
                self.errors.append(f"Sequence flow {flow_id} targetRef not found: {refs['target']}")
    
    def _check_di_completeness(self):
        """Check that all BPMN elements have DI representation"""
        # Find all DI shapes
        di_shapes = set()
        for shape in self.root.iter():
            if shape.tag.endswith('BPMNShape'):
                ref = shape.get('bpmnElement')
                if ref:
                    di_shapes.add(ref)
        
        # Find all DI edges
        di_edges = set()
        for edge in self.root.iter():
            if edge.tag.endswith('BPMNEdge'):
                ref = edge.get('bpmnElement')
                if ref:
                    di_edges.add(ref)
        
        # Check flow nodes have shapes
        for node_id in self.flow_nodes:
            if node_id not in di_shapes:
                self.warnings.append(f"Flow node missing DI shape: {node_id}")
        
        # Check sequence flows have edges
        for flow_id in self.sequence_flows.keys():
            if flow_id not in di_edges:
                self.warnings.append(f"Sequence flow missing DI edge: {flow_id}")
        
        # Check for DI diagram existence
        has_diagram = False
        for elem in self.root.iter():
            if elem.tag.endswith('BPMNDiagram'):
                has_diagram = True
                break
        
        if not has_diagram:
            self.errors.append("No BPMNDiagram found - diagram will not render")
    
    def _check_event_flows(self):
        """Check event flow rules"""
        for node in self.root.iter():
            node_id = node.get('id')
            
            # Start events should have no incoming flows
            if node.tag.endswith('startEvent'):
                incoming = [child.text for child in node.iter() if child.tag.endswith('incoming')]
                if incoming:
                    self.errors.append(f"Start event {node_id} should not have incoming flows")
            
            # End events should have no outgoing flows
            if node.tag.endswith('endEvent'):
                outgoing = [child.text for child in node.iter() if child.tag.endswith('outgoing')]
                if outgoing:
                    self.errors.append(f"End event {node_id} should not have outgoing flows")
    
    def _check_gateway_flows(self):
        """Check gateway flow rules"""
        for node in self.root.iter():
            if 'Gateway' in node.tag:
                node_id = node.get('id')
                incoming = [child.text for child in node.iter() if child.tag.endswith('incoming')]
                outgoing = [child.text for child in node.iter() if child.tag.endswith('outgoing')]
                
                # Splitting gateway should have at least 2 outgoing
                if len(incoming) == 1 and len(outgoing) < 2:
                    self.warnings.append(f"Gateway {node_id} splitting but has only {len(outgoing)} outgoing flow(s)")
                
                # Merging gateway should have at least 2 incoming
                if len(outgoing) == 1 and len(incoming) < 2:
                    self.warnings.append(f"Gateway {node_id} merging but has only {len(incoming)} incoming flow(s)")
    
    def _report_results(self):
        """Print validation results"""
        print()
        
        if self.errors:
            print(f"❌ ERRORS ({len(self.errors)}):")
            for error in self.errors:
                print(f"  - {error}")
            print()
        
        if self.warnings:
            print(f"⚠️  WARNINGS ({len(self.warnings)}):")
            for warning in self.warnings:
                print(f"  - {warning}")
            print()
        
        if not self.errors and not self.warnings:
            print("✅ Validation passed - no errors or warnings found")
        elif not self.errors:
            print("✅ Validation passed - warnings found but no errors")
        else:
            print("❌ Validation failed - errors found")
        
        print("=" * 60)
        print(f"Summary:")
        print(f"  - Flow nodes: {len(self.flow_nodes)}")
        print(f"  - Sequence flows: {len(self.sequence_flows)}")
        print(f"  - Total elements with IDs: {len(self.element_ids)}")
        print(f"  - Errors: {len(self.errors)}")
        print(f"  - Warnings: {len(self.warnings)}")


def main():
    if len(sys.argv) != 2:
        print("Usage: python validate_bpmn.py <bpmn-file>")
        sys.exit(1)
    
    validator = BPMNValidator(sys.argv[1])
    success = validator.validate()
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
