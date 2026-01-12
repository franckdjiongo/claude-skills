---
name: bpmn-creator
description: Create valid BPMN 2.0 XML diagrams from textual process descriptions or diagrams. Use when the user requests BPMN creation, process modeling, workflow diagrams, or conversion of process descriptions to BPMN format. Generates fully compliant BPMN 2.0 XML with complete diagram interchange (DI) information for visual rendering in BPMN tools.
---

# BPMN Creator

Create valid BPMN 2.0 XML diagrams with complete visual layout information.

## Overview

This skill guides the creation of Business Process Model and Notation (BPMN) 2.0 XML files that:
- Comply with the OMG BPMN 2.0 specification
- Include complete BPMN Diagram Interchange (DI) for visual rendering
- Can be imported into tools like Camunda Modeler, bpmn.io, or other BPMN editors
- Support collaboration diagrams with multiple participants (pools), lanes, and message flows

## When to Use

Use this skill when the user:
- Requests a BPMN diagram or process model
- Provides a textual process description to convert to BPMN
- Asks to transform an ASCII diagram or flowchart to BPMN
- Needs a standardized workflow representation
- Wants to document business processes in BPMN format

## BPMN Creation Workflow

Follow these steps to create a valid BPMN diagram:

### 1. Understand the Process

Analyze the process description to identify:
- **Participants (Pools)**: Organizations, systems, or roles involved
- **Lanes**: Sub-divisions within participants
- **Activities**: Tasks and sub-processes
- **Events**: Start, intermediate, and end events
- **Gateways**: Decision points (exclusive, parallel, inclusive)
- **Flows**: Sequence flows within participants and message flows between participants
- **Data**: Data objects, stores, and associations

### 2. Design the Structure

Create a mental model of the diagram:
- Group activities by participant/lane
- Identify message exchanges between participants
- Map out the sequence flow within each process
- Note any parallel or conditional branches

### 3. Generate the XML

Use the reference example as a template and follow the structure patterns below.

## BPMN 2.0 XML Structure

### Root Definition

```xml
<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
             xmlns:omgdc="http://www.omg.org/spec/DD/20100524/DC"
             xmlns:omgdi="http://www.omg.org/spec/DD/20100524/DI"
             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
             targetNamespace="http://bpmn.io/schema/bpmn"
             id="Definitions_1">
```

### Collaboration (Multi-Participant Diagrams)

```xml
<collaboration id="Collaboration_Name">
  <participant id="Participant_1" name="Participant Name" processRef="Process_1"/>
  <participant id="Participant_2" name="System Name"/>
  <messageFlow id="Flow_Message" sourceRef="Activity_1" targetRef="Participant_2"/>
</collaboration>
```

### Process Definition

```xml
<process id="Process_1" name="Process Name" isExecutable="false">
  <laneSet id="LaneSet_1">
    <lane id="Lane_1" name="Lane Name">
      <flowNodeRef>StartEvent_1</flowNodeRef>
      <flowNodeRef>Activity_1</flowNodeRef>
      <flowNodeRef>EndEvent_1</flowNodeRef>
    </lane>
  </laneSet>
  
  <!-- Events -->
  <startEvent id="StartEvent_1" name="Start Name">
    <outgoing>Flow_1</outgoing>
  </startEvent>
  
  <endEvent id="EndEvent_1" name="End Name">
    <incoming>Flow_2</incoming>
  </endEvent>
  
  <!-- Activities -->
  <userTask id="Activity_1" name="Task Name">
    <incoming>Flow_1</incoming>
    <outgoing>Flow_2</outgoing>
  </userTask>
  
  <!-- Sequence Flows -->
  <sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Activity_1"/>
  <sequenceFlow id="Flow_2" sourceRef="Activity_1" targetRef="EndEvent_1"/>
</process>
```

### Gateways

**Exclusive Gateway (XOR - one path):**
```xml
<exclusiveGateway id="Gateway_1" name="Decision?">
  <incoming>Flow_In</incoming>
  <outgoing>Flow_Yes</outgoing>
  <outgoing>Flow_No</outgoing>
</exclusiveGateway>

<sequenceFlow id="Flow_Yes" name="Yes" sourceRef="Gateway_1" targetRef="Activity_Yes"/>
<sequenceFlow id="Flow_No" name="No" sourceRef="Gateway_1" targetRef="Activity_No"/>
```

**Parallel Gateway (AND - all paths):**
```xml
<parallelGateway id="Gateway_1" name="Parallel Split">
  <incoming>Flow_In</incoming>
  <outgoing>Flow_Path1</outgoing>
  <outgoing>Flow_Path2</outgoing>
</parallelGateway>
```

### Event Types

**Timer Event:**
```xml
<startEvent id="StartEvent_1" name="Daily Trigger">
  <timerEventDefinition/>
  <outgoing>Flow_1</outgoing>
</startEvent>
```

**Message Event:**
```xml
<startEvent id="StartEvent_1" name="Message Received">
  <messageEventDefinition/>
  <outgoing>Flow_1</outgoing>
</startEvent>
```

### Task Types

- `<userTask>` - Manual human task
- `<serviceTask>` - Automated service call
- `<scriptTask>` - Script execution
- `<manualTask>` - Physical task outside system
- `<sendTask>` - Send message
- `<receiveTask>` - Wait for message

## BPMN Diagram Interchange (DI)

**CRITICAL**: Always include complete DI information for visual rendering. Without DI, the diagram will not display properly.

### Diagram Structure

```xml
<bpmndi:BPMNDiagram id="BPMNDiagram_1">
  <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Collaboration_Name">
    <!-- Shapes and edges go here -->
  </bpmndi:BPMNPlane>
</bpmndi:BPMNDiagram>
```

### Shape Positioning

**Participant (Pool):**
```xml
<bpmndi:BPMNShape id="Participant_1_di" bpmnElement="Participant_1" isHorizontal="true">
  <omgdc:Bounds x="160" y="80" width="900" height="250"/>
</bpmndi:BPMNShape>
```

**Lane:**
```xml
<bpmndi:BPMNShape id="Lane_1_di" bpmnElement="Lane_1" isHorizontal="true">
  <omgdc:Bounds x="190" y="80" width="870" height="250"/>
</bpmndi:BPMNShape>
```

**Start Event (circle - 36x36):**
```xml
<bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
  <omgdc:Bounds x="242" y="187" width="36" height="36"/>
</bpmndi:BPMNShape>
```

**Activity (rectangle - 100x80):**
```xml
<bpmndi:BPMNShape id="Activity_1_di" bpmnElement="Activity_1">
  <omgdc:Bounds x="320" y="165" width="100" height="80"/>
</bpmndi:BPMNShape>
```

**Gateway (diamond - 50x50):**
```xml
<bpmndi:BPMNShape id="Gateway_1_di" bpmnElement="Gateway_1" isMarkerVisible="true">
  <omgdc:Bounds x="475" y="425" width="50" height="50"/>
</bpmndi:BPMNShape>
```

**End Event (circle - 36x36):**
```xml
<bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
  <omgdc:Bounds x="1012" y="187" width="36" height="36"/>
</bpmndi:BPMNShape>
```

### Edge Routing

**Sequence Flow:**
```xml
<bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
  <omgdi:waypoint x="278" y="205"/>
  <omgdi:waypoint x="320" y="205"/>
</bpmndi:BPMNEdge>
```

**Curved Flow (with waypoints):**
```xml
<bpmndi:BPMNEdge id="Flow_Complex_di" bpmnElement="Flow_Complex">
  <omgdi:waypoint x="278" y="205"/>
  <omgdi:waypoint x="300" y="205"/>
  <omgdi:waypoint x="300" y="300"/>
  <omgdi:waypoint x="400" y="300"/>
</bpmndi:BPMNEdge>
```

## Layout Guidelines

### Standard Dimensions

- **Start/End Events**: 36x36 pixels
- **Activities**: 100x80 pixels
- **Gateways**: 50x50 pixels
- **Pool height**: 200-300 pixels per lane
- **Pool width**: 900-1200 pixels
- **Horizontal spacing**: 140 pixels between elements
- **Vertical spacing**: 80 pixels between lanes

### Positioning Strategy

1. **Pools**: Stack vertically with 20px gaps
2. **Start position**: x=242, y=center of lane
3. **Activity spacing**: 140px horizontal gaps
4. **Lane offset**: 30px from pool boundary
5. **Waypoint alignment**: Use multiples of 10 for clean routing

### Typical Layout Pattern

```
Pool (x=160, y=80, width=900, height=250)
  └─ Lane (x=190, y=80, width=870, height=250)
      ├─ Start (x=242, y=187)
      ├─ Task 1 (x=320, y=165)
      ├─ Task 2 (x=460, y=165)
      ├─ Task 3 (x=600, y=165)
      └─ End (x=1012, y=187)
```

## Common Patterns

### Linear Process

Start → Task1 → Task2 → Task3 → End

### Decision Point

Task → Gateway → [Yes] Task A → Merge
                 [No]  Task B → Merge → End

### Parallel Execution

Task → Parallel Split → Task A → Parallel Join
                      → Task B → Parallel Join → End

### Sub-Process

Task → Sub-Process (collapsed) → End
  └─ (Contains internal flow)

### Message Exchange

```xml
<messageFlow id="Flow_Request" sourceRef="Activity_User" targetRef="Participant_System"/>
<messageFlow id="Flow_Response" sourceRef="Participant_System" targetRef="Activity_User"/>
```

## Validation Checklist

Before finalizing the BPMN file, verify:

- [ ] All `flowNodeRef` elements match actual node IDs
- [ ] All `incoming`/`outgoing` references match sequence flow IDs
- [ ] All `sourceRef`/`targetRef` point to valid elements
- [ ] Every process element has a corresponding DI shape or edge
- [ ] Every DI element references a valid BPMN element via `bpmnElement`
- [ ] Shape positions don't overlap
- [ ] Waypoints create valid connections
- [ ] Start events have no incoming flows
- [ ] End events have no outgoing flows
- [ ] Gateways have at least 2 outgoing (split) or 2 incoming (join) flows

## Reference Example

See `references/example-process.bpmn` for a complete, working example of a multi-participant BPMN diagram with:
- 5 user participants with lanes
- 3 external system participants
- Timer, message, and standard events
- User tasks and service tasks
- Exclusive gateways with conditional flows
- Message flows between participants
- Complete DI layout for all elements

## Troubleshooting

**"No diagram to display" error:**
- Missing or incomplete BPMN DI section
- Ensure every BPMN element has a corresponding `<bpmndi:BPMNShape>` or `<bpmndi:BPMNEdge>`
- Verify all `bpmnElement` attributes reference valid IDs

**Import errors:**
- Check XML namespace declarations in root `<definitions>`
- Verify all IDs are unique
- Ensure proper element nesting (process contains flow nodes)

**Layout issues:**
- Check coordinate bounds don't overlap
- Verify waypoints are in logical order
- Ensure shapes are positioned within pool/lane boundaries

## Output Format

Always save BPMN files with `.bpmn` extension to `/mnt/user-data/outputs/` directory and provide a download link.
