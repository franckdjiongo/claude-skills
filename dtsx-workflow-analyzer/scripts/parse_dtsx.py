#!/usr/bin/env python3
"""
DTSX Workflow Parser
Extracts structured workflow data from SSIS/KingswaySoft DTSX packages.
"""

import xml.etree.ElementTree as ET
import json
import sys
import re
from pathlib import Path
from typing import Dict, List, Any, Optional


class DTSXParser:
    """Parser for DTSX (SSIS Package) files."""
    
    DTS_NS = "www.microsoft.com/SqlServer/Dts"
    
    def __init__(self, filepath: str):
        self.filepath = Path(filepath)
        self.tree = None
        self.root = None
        self.ns = {"DTS": self.DTS_NS}
        
    def parse(self) -> Dict[str, Any]:
        """Parse DTSX file and return structured data."""
        self.tree = ET.parse(self.filepath)
        self.root = self.tree.getroot()
        
        return {
            "package": self._extract_package_metadata(),
            "connections": self._extract_connections(),
            "data_flows": self._extract_data_flows(),
            "control_flow": self._extract_control_flow()
        }
    
    def _extract_package_metadata(self) -> Dict[str, str]:
        """Extract package-level metadata."""
        attrs = self.root.attrib
        return {
            "name": attrs.get(f"{{{self.DTS_NS}}}ObjectName", "Unknown"),
            "creation_date": attrs.get(f"{{{self.DTS_NS}}}CreationDate", ""),
            "creator": attrs.get(f"{{{self.DTS_NS}}}CreatorName", ""),
            "computer": attrs.get(f"{{{self.DTS_NS}}}CreatorComputerName", ""),
            "version_build": attrs.get(f"{{{self.DTS_NS}}}VersionBuild", ""),
            "last_modified_version": attrs.get(f"{{{self.DTS_NS}}}LastModifiedProductVersion", "")
        }
    
    def _extract_connections(self) -> List[Dict[str, str]]:
        """Extract connection manager information."""
        connections = []
        
        # Look for connection managers in the package
        for conn in self.root.findall(".//DTS:ConnectionManager", self.ns):
            conn_data = {
                "ref_id": conn.attrib.get(f"{{{self.DTS_NS}}}refId", ""),
                "name": conn.attrib.get(f"{{{self.DTS_NS}}}ObjectName", ""),
                "creation_name": conn.attrib.get(f"{{{self.DTS_NS}}}CreationName", ""),
                "dtsid": conn.attrib.get(f"{{{self.DTS_NS}}}DTSID", "")
            }
            
            # Try to extract connection string
            obj_data = conn.find(".//DTS:ObjectData", self.ns)
            if obj_data is not None:
                for child in obj_data:
                    if "connectionString" in child.attrib:
                        conn_data["connection_string"] = child.attrib.get("connectionString", "")
                        break
            
            connections.append(conn_data)
        
        return connections
    
    def _extract_data_flows(self) -> List[Dict[str, Any]]:
        """Extract data flow tasks and their components."""
        data_flows = []
        
        # Find all Pipeline (Data Flow) executables
        for executable in self.root.findall(".//DTS:Executable", self.ns):
            creation_name = executable.attrib.get(f"{{{self.DTS_NS}}}CreationName", "")
            if creation_name == "Microsoft.Pipeline":
                flow_data = {
                    "name": executable.attrib.get(f"{{{self.DTS_NS}}}ObjectName", ""),
                    "ref_id": executable.attrib.get(f"{{{self.DTS_NS}}}refId", ""),
                    "disabled": executable.attrib.get(f"{{{self.DTS_NS}}}Disabled", "False") == "True",
                    "description": executable.attrib.get(f"{{{self.DTS_NS}}}Description", ""),
                    "components": self._extract_pipeline_components(executable)
                }
                data_flows.append(flow_data)
        
        return data_flows
    
    def _extract_pipeline_components(self, pipeline: ET.Element) -> List[Dict[str, Any]]:
        """Extract components from a data flow pipeline."""
        components = []
        
        # Find the pipeline element within ObjectData
        for component in pipeline.findall(".//component"):
            comp_data = {
                "ref_id": component.attrib.get("refId", ""),
                "name": component.attrib.get("name", ""),
                "description": component.attrib.get("description", ""),
                "component_class": component.attrib.get("componentClassID", ""),
                "contact_info": component.attrib.get("contactInfo", ""),
                "properties": self._extract_component_properties(component),
                "connections": self._extract_component_connections(component),
                "inputs": self._extract_component_inputs(component),
                "outputs": self._extract_component_outputs(component)
            }
            
            # Determine component type
            comp_data["type"] = self._determine_component_type(comp_data)
            
            components.append(comp_data)
        
        return components
    
    def _extract_component_properties(self, component: ET.Element) -> Dict[str, str]:
        """Extract properties from a component."""
        properties = {}
        
        for prop in component.findall(".//property"):
            name = prop.attrib.get("name", "")
            value = prop.text or ""
            if name:
                properties[name] = value
        
        return properties
    
    def _extract_component_connections(self, component: ET.Element) -> List[Dict[str, str]]:
        """Extract connections from a component."""
        connections = []
        
        for conn in component.findall(".//connection"):
            connections.append({
                "ref_id": conn.attrib.get("refId", ""),
                "name": conn.attrib.get("name", ""),
                "connection_manager_id": conn.attrib.get("connectionManagerID", ""),
                "connection_manager_ref": conn.attrib.get("connectionManagerRefId", ""),
                "description": conn.attrib.get("description", "")
            })
        
        return connections
    
    def _extract_component_inputs(self, component: ET.Element) -> List[Dict[str, Any]]:
        """Extract input columns from a component."""
        inputs = []
        
        for inp in component.findall(".//input"):
            input_data = {
                "ref_id": inp.attrib.get("refId", ""),
                "name": inp.attrib.get("name", ""),
                "columns": []
            }
            
            for col in inp.findall(".//inputColumn"):
                col_data = {
                    "ref_id": col.attrib.get("refId", ""),
                    "cached_name": col.attrib.get("cachedName", ""),
                    "cached_data_type": col.attrib.get("cachedDataType", ""),
                    "cached_length": col.attrib.get("cachedLength", ""),
                    "cached_precision": col.attrib.get("cachedPrecision", ""),
                    "cached_scale": col.attrib.get("cachedScale", ""),
                    "external_metadata_column_id": col.attrib.get("externalMetadataColumnId", ""),
                    "lineage_id": col.attrib.get("lineageId", "")
                }
                
                # Extract destination column name from external metadata reference
                ext_meta_id = col_data["external_metadata_column_id"]
                if ext_meta_id:
                    match = re.search(r'ExternalColumns\[([^\]]+)\]', ext_meta_id)
                    if match:
                        col_data["destination_column"] = match.group(1)
                
                input_data["columns"].append(col_data)
            
            inputs.append(input_data)
        
        return inputs
    
    def _extract_component_outputs(self, component: ET.Element) -> List[Dict[str, Any]]:
        """Extract output columns from a component."""
        outputs = []
        
        for out in component.findall(".//output"):
            output_data = {
                "ref_id": out.attrib.get("refId", ""),
                "name": out.attrib.get("name", ""),
                "columns": []
            }
            
            for col in out.findall(".//outputColumn"):
                col_data = {
                    "ref_id": col.attrib.get("refId", ""),
                    "name": col.attrib.get("name", ""),
                    "data_type": col.attrib.get("dataType", ""),
                    "length": col.attrib.get("length", ""),
                    "precision": col.attrib.get("precision", ""),
                    "scale": col.attrib.get("scale", ""),
                    "lineage_id": col.attrib.get("lineageId", "")
                }
                output_data["columns"].append(col_data)
            
            outputs.append(output_data)
        
        return outputs
    
    def _determine_component_type(self, comp_data: Dict[str, Any]) -> str:
        """Determine the type of component based on its properties."""
        name = comp_data.get("name", "").lower()
        contact = comp_data.get("contact_info", "").lower()
        description = comp_data.get("description", "").lower()
        
        if "kingswaysoft" in contact:
            if "destination" in name or "destination" in description:
                return "KingswaySoft_Destination"
            elif "source" in name or "source" in description:
                return "KingswaySoft_Source"
        
        if "source" in name:
            return "Source"
        elif "destination" in name:
            return "Destination"
        elif "derived" in name or "derived column" in description:
            return "Derived_Column"
        elif "lookup" in name:
            return "Lookup"
        elif "conditional split" in name or "conditional split" in description:
            return "Conditional_Split"
        elif "aggregate" in name:
            return "Aggregate"
        elif "sort" in name:
            return "Sort"
        elif "union" in name:
            return "Union"
        elif "merge" in name:
            return "Merge"
        
        return "Unknown"
    
    def _extract_control_flow(self) -> List[Dict[str, Any]]:
        """Extract control flow tasks."""
        tasks = []
        
        executables = self.root.find(".//DTS:Executables", self.ns)
        if executables is None:
            return tasks
        
        for executable in executables.findall("DTS:Executable", self.ns):
            creation_name = executable.attrib.get(f"{{{self.DTS_NS}}}CreationName", "")
            
            task_data = {
                "name": executable.attrib.get(f"{{{self.DTS_NS}}}ObjectName", ""),
                "ref_id": executable.attrib.get(f"{{{self.DTS_NS}}}refId", ""),
                "creation_name": creation_name,
                "disabled": executable.attrib.get(f"{{{self.DTS_NS}}}Disabled", "False") == "True",
                "description": executable.attrib.get(f"{{{self.DTS_NS}}}Description", "")
            }
            
            # Classify task type
            if creation_name == "Microsoft.Pipeline":
                task_data["type"] = "Data Flow Task"
            elif "ExecuteSQLTask" in creation_name:
                task_data["type"] = "Execute SQL Task"
            elif "ExecutePackageTask" in creation_name:
                task_data["type"] = "Execute Package Task"
            elif "ScriptTask" in creation_name:
                task_data["type"] = "Script Task"
            else:
                task_data["type"] = creation_name
            
            tasks.append(task_data)
        
        return tasks


def generate_column_mapping_table(components: List[Dict]) -> str:
    """Generate markdown table of column mappings."""
    lines = []
    
    for comp in components:
        if comp.get("type") in ["KingswaySoft_Destination", "Destination"]:
            dest_entity = comp.get("properties", {}).get("DestinationEntity", "Unknown")
            lines.append(f"\n### Destination: {dest_entity}\n")
            lines.append("| Source Column | Destination Column | Data Type | Notes |")
            lines.append("|--------------|-------------------|-----------|-------|")
            
            for inp in comp.get("inputs", []):
                for col in inp.get("columns", []):
                    src = col.get("cached_name", "")
                    dst = col.get("destination_column", "")
                    dtype = col.get("cached_data_type", "")
                    notes = ""
                    
                    if col.get("cached_length"):
                        notes = f"Length: {col['cached_length']}"
                    elif col.get("cached_precision"):
                        notes = f"Precision: {col['cached_precision']}, Scale: {col.get('cached_scale', '')}"
                    
                    lines.append(f"| {src} | {dst} | {dtype} | {notes} |")
    
    return "\n".join(lines)


def main():
    if len(sys.argv) < 2:
        print("Usage: python parse_dtsx.py <path_to_dtsx_file>", file=sys.stderr)
        sys.exit(1)
    
    filepath = sys.argv[1]
    
    try:
        parser = DTSXParser(filepath)
        result = parser.parse()
        
        # Output as formatted JSON
        print(json.dumps(result, indent=2))
        
    except ET.ParseError as e:
        print(f"XML Parse Error: {e}", file=sys.stderr)
        sys.exit(1)
    except FileNotFoundError:
        print(f"File not found: {filepath}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
