# BPMN 2.0 Elements Reference

This document provides quick reference for BPMN 2.0 XML element structures.

## Flow Objects

### Events

**Start Event (None)**
```xml
<startEvent id="StartEvent_1" name="Process Started">
  <outgoing>Flow_1</outgoing>
</startEvent>
```

**Start Event (Timer)**
```xml
<startEvent id="StartEvent_Timer" name="Scheduled Start">
  <timerEventDefinition/>
  <outgoing>Flow_1</outgoing>
</startEvent>
```

**Start Event (Message)**
```xml
<startEvent id="StartEvent_Message" name="Message Received">
  <messageEventDefinition/>
  <outgoing>Flow_1</outgoing>
</startEvent>
```

**Intermediate Event (Timer)**
```xml
<intermediateCatchEvent id="Event_Wait" name="Wait 24 hours">
  <incoming>Flow_1</incoming>
  <outgoing>Flow_2</outgoing>
  <timerEventDefinition/>
</intermediateCatchEvent>
```

**Intermediate Event (Message)**
```xml
<intermediateCatchEvent id="Event_Receive" name="Wait for approval">
  <incoming>Flow_1</incoming>
  <outgoing>Flow_2</outgoing>
  <messageEventDefinition/>
</intermediateCatchEvent>
```

**End Event (None)**
```xml
<endEvent id="EndEvent_1" name="Process Completed">
  <incoming>Flow_1</incoming>
</endEvent>
```

**End Event (Terminate)**
```xml
<endEvent id="EndEvent_Terminate" name="Process Terminated">
  <incoming>Flow_1</incoming>
  <terminateEventDefinition/>
</endEvent>
```

**End Event (Message)**
```xml
<endEvent id="EndEvent_Message" name="Send Notification">
  <incoming>Flow_1</incoming>
  <messageEventDefinition/>
</endEvent>
```

### Activities

**User Task**
```xml
<userTask id="Task_Review" name="Review Document">
  <incoming>Flow_1</incoming>
  <outgoing>Flow_2</outgoing>
</userTask>
```

**Service Task**
```xml
<serviceTask id="Task_API" name="Call External API">
  <incoming>Flow_1</incoming>
  <outgoing>Flow_2</outgoing>
</serviceTask>
```

**Script Task**
```xml
<scriptTask id="Task_Calculate" name="Calculate Total">
  <incoming>Flow_1</incoming>
  <outgoing>Flow_2</outgoing>
</scriptTask>
```

**Send Task**
```xml
<sendTask id="Task_Send" name="Send Email">
  <incoming>Flow_1</incoming>
  <outgoing>Flow_2</outgoing>
</sendTask>
```

**Receive Task**
```xml
<receiveTask id="Task_Receive" name="Receive Confirmation">
  <incoming>Flow_1</incoming>
  <outgoing>Flow_2</outgoing>
</receiveTask>
```

**Manual Task**
```xml
<manualTask id="Task_Manual" name="Physical Inspection">
  <incoming>Flow_1</incoming>
  <outgoing>Flow_2</outgoing>
</manualTask>
```

**Sub-Process (Collapsed)**
```xml
<subProcess id="SubProcess_1" name="Handle Payment">
  <incoming>Flow_1</incoming>
  <outgoing>Flow_2</outgoing>
  <!-- Internal flow nodes go here -->
  <startEvent id="SubStart_1">
    <outgoing>SubFlow_1</outgoing>
  </startEvent>
  <userTask id="SubTask_1" name="Verify Payment">
    <incoming>SubFlow_1</incoming>
    <outgoing>SubFlow_2</outgoing>
  </userTask>
  <endEvent id="SubEnd_1">
    <incoming>SubFlow_2</incoming>
  </endEvent>
  <sequenceFlow id="SubFlow_1" sourceRef="SubStart_1" targetRef="SubTask_1"/>
  <sequenceFlow id="SubFlow_2" sourceRef="SubTask_1" targetRef="SubEnd_1"/>
</subProcess>
```

**Call Activity**
```xml
<callActivity id="CallActivity_1" name="Call Reusable Process" calledElement="ProcessDefinitionKey">
  <incoming>Flow_1</incoming>
  <outgoing>Flow_2</outgoing>
</callActivity>
```

### Gateways

**Exclusive Gateway (XOR)**
```xml
<exclusiveGateway id="Gateway_Decision" name="Is Approved?">
  <incoming>Flow_1</incoming>
  <outgoing>Flow_Yes</outgoing>
  <outgoing>Flow_No</outgoing>
</exclusiveGateway>

<sequenceFlow id="Flow_Yes" name="Yes" sourceRef="Gateway_Decision" targetRef="Task_Approved"/>
<sequenceFlow id="Flow_No" name="No" sourceRef="Gateway_Decision" targetRef="Task_Rejected"/>
```

**Parallel Gateway (AND)**
```xml
<!-- Split -->
<parallelGateway id="Gateway_Split" name="Parallel Split">
  <incoming>Flow_1</incoming>
  <outgoing>Flow_Branch1</outgoing>
  <outgoing>Flow_Branch2</outgoing>
</parallelGateway>

<!-- Join -->
<parallelGateway id="Gateway_Join" name="Parallel Join">
  <incoming>Flow_Branch1_End</incoming>
  <incoming>Flow_Branch2_End</incoming>
  <outgoing>Flow_Continue</outgoing>
</parallelGateway>
```

**Inclusive Gateway (OR)**
```xml
<inclusiveGateway id="Gateway_Inclusive" name="Select Options">
  <incoming>Flow_1</incoming>
  <outgoing>Flow_Option1</outgoing>
  <outgoing>Flow_Option2</outgoing>
  <outgoing>Flow_Option3</outgoing>
</inclusiveGateway>
```

**Event-Based Gateway**
```xml
<eventBasedGateway id="Gateway_Event" name="Wait for Event">
  <incoming>Flow_1</incoming>
  <outgoing>Flow_Timer</outgoing>
  <outgoing>Flow_Message</outgoing>
</eventBasedGateway>

<intermediateCatchEvent id="Event_Timer" name="Timeout">
  <incoming>Flow_Timer</incoming>
  <outgoing>Flow_Timeout</outgoing>
  <timerEventDefinition/>
</intermediateCatchEvent>

<intermediateCatchEvent id="Event_Message" name="Response Received">
  <incoming>Flow_Message</incoming>
  <outgoing>Flow_Response</outgoing>
  <messageEventDefinition/>
</intermediateCatchEvent>
```

## Connecting Objects

### Sequence Flow

**Basic Flow**
```xml
<sequenceFlow id="Flow_1" sourceRef="Task_1" targetRef="Task_2"/>
```

**Conditional Flow**
```xml
<sequenceFlow id="Flow_Conditional" name="Amount > 1000" sourceRef="Gateway_1" targetRef="Task_Manager">
  <conditionExpression xsi:type="tFormalExpression">${amount &gt; 1000}</conditionExpression>
</sequenceFlow>
```

**Default Flow**
```xml
<exclusiveGateway id="Gateway_1" name="Check Amount" default="Flow_Default">
  <incoming>Flow_In</incoming>
  <outgoing>Flow_High</outgoing>
  <outgoing>Flow_Default</outgoing>
</exclusiveGateway>

<sequenceFlow id="Flow_High" name="High Amount" sourceRef="Gateway_1" targetRef="Task_Escalate">
  <conditionExpression xsi:type="tFormalExpression">${amount &gt; 1000}</conditionExpression>
</sequenceFlow>

<sequenceFlow id="Flow_Default" name="Normal Process" sourceRef="Gateway_1" targetRef="Task_Normal"/>
```

### Message Flow

```xml
<messageFlow id="MessageFlow_Request" name="Send Request" 
             sourceRef="Task_RequestInfo" targetRef="Participant_ExternalSystem"/>

<messageFlow id="MessageFlow_Response" name="Receive Response" 
             sourceRef="Participant_ExternalSystem" targetRef="Task_ProcessResponse"/>
```

### Association

```xml
<association id="Association_1" sourceRef="Task_1" targetRef="TextAnnotation_1"/>

<textAnnotation id="TextAnnotation_1">
  <text>This task requires manager approval</text>
</textAnnotation>
```

## Data Objects

### Data Object

```xml
<dataObject id="DataObject_Invoice" name="Invoice"/>

<dataObjectReference id="DataObjectRef_Invoice" name="Invoice" dataObjectRef="DataObject_Invoice"/>
```

### Data Store

```xml
<dataStoreReference id="DataStore_Customer" name="Customer Database"/>
```

### Data Input/Output

```xml
<ioSpecification>
  <dataInput id="Input_CustomerData" name="Customer Data"/>
  <dataOutput id="Output_ValidationResult" name="Validation Result"/>
  <inputSet>
    <dataInputRefs>Input_CustomerData</dataInputRefs>
  </inputSet>
  <outputSet>
    <dataOutputRefs>Output_ValidationResult</dataOutputRefs>
  </outputSet>
</ioSpecification>
```

## Swimlanes

### Pool (Participant)

```xml
<collaboration id="Collaboration_1">
  <participant id="Participant_Customer" name="Customer" processRef="Process_Customer"/>
  <participant id="Participant_Company" name="Company" processRef="Process_Company"/>
  <participant id="Participant_System" name="External System"/>
</collaboration>
```

### Lane

```xml
<process id="Process_Company">
  <laneSet id="LaneSet_1">
    <lane id="Lane_Sales" name="Sales Department">
      <flowNodeRef>Task_ReceiveOrder</flowNodeRef>
      <flowNodeRef>Task_CreateQuote</flowNodeRef>
    </lane>
    <lane id="Lane_Finance" name="Finance Department">
      <flowNodeRef>Task_ProcessPayment</flowNodeRef>
      <flowNodeRef>Task_IssueInvoice</flowNodeRef>
    </lane>
    <lane id="Lane_Operations" name="Operations">
      <flowNodeRef>Task_FulfillOrder</flowNodeRef>
      <flowNodeRef>Task_ShipProduct</flowNodeRef>
    </lane>
  </laneSet>
  
  <!-- Flow nodes defined here -->
</process>
```

## Artifacts

### Text Annotation

```xml
<textAnnotation id="TextAnnotation_1">
  <text>Important: This step requires verification from two managers</text>
</textAnnotation>

<association id="Association_1" sourceRef="Task_Approval" targetRef="TextAnnotation_1"/>
```

### Group

```xml
<group id="Group_CriticalPath" categoryValueRef="CategoryValue_Critical"/>

<category id="Category_1">
  <categoryValue id="CategoryValue_Critical" value="Critical Path"/>
</category>
```

## Common Combinations

### User Approval Pattern

```xml
<userTask id="Task_Request" name="Submit Request">
  <outgoing>Flow_1</outgoing>
</userTask>

<userTask id="Task_Review" name="Review Request">
  <incoming>Flow_1</incoming>
  <outgoing>Flow_2</outgoing>
</userTask>

<exclusiveGateway id="Gateway_Approved" name="Approved?">
  <incoming>Flow_2</incoming>
  <outgoing>Flow_Yes</outgoing>
  <outgoing>Flow_No</outgoing>
</exclusiveGateway>

<userTask id="Task_Process" name="Process Approval">
  <incoming>Flow_Yes</incoming>
  <outgoing>Flow_3</outgoing>
</userTask>

<userTask id="Task_Reject" name="Send Rejection">
  <incoming>Flow_No</incoming>
  <outgoing>Flow_4</outgoing>
</userTask>

<sequenceFlow id="Flow_1" sourceRef="Task_Request" targetRef="Task_Review"/>
<sequenceFlow id="Flow_2" sourceRef="Task_Review" targetRef="Gateway_Approved"/>
<sequenceFlow id="Flow_Yes" name="Yes" sourceRef="Gateway_Approved" targetRef="Task_Process"/>
<sequenceFlow id="Flow_No" name="No" sourceRef="Gateway_Approved" targetRef="Task_Reject"/>
```

### Retry Pattern with Timer

```xml
<serviceTask id="Task_CallAPI" name="Call External API">
  <incoming>Flow_1</incoming>
  <outgoing>Flow_2</outgoing>
</serviceTask>

<exclusiveGateway id="Gateway_Success" name="Success?">
  <incoming>Flow_2</incoming>
  <outgoing>Flow_Success</outgoing>
  <outgoing>Flow_Retry</outgoing>
</exclusiveGateway>

<intermediateCatchEvent id="Event_Wait" name="Wait 5 minutes">
  <incoming>Flow_Retry</incoming>
  <outgoing>Flow_RetryLoop</outgoing>
  <timerEventDefinition/>
</intermediateCatchEvent>

<sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_CallAPI"/>
<sequenceFlow id="Flow_2" sourceRef="Task_CallAPI" targetRef="Gateway_Success"/>
<sequenceFlow id="Flow_Success" name="Success" sourceRef="Gateway_Success" targetRef="Task_Continue"/>
<sequenceFlow id="Flow_Retry" name="Retry" sourceRef="Gateway_Success" targetRef="Event_Wait"/>
<sequenceFlow id="Flow_RetryLoop" sourceRef="Event_Wait" targetRef="Task_CallAPI"/>
```

### Multi-Instance Pattern (Parallel)

```xml
<userTask id="Task_ParallelReview" name="Review Document">
  <incoming>Flow_1</incoming>
  <outgoing>Flow_2</outgoing>
  <multiInstanceLoopCharacteristics isSequential="false">
    <loopCardinality>3</loopCardinality>
  </multiInstanceLoopCharacteristics>
</userTask>
```

### Multi-Instance Pattern (Sequential)

```xml
<userTask id="Task_SequentialReview" name="Review Document">
  <incoming>Flow_1</incoming>
  <outgoing>Flow_2</outgoing>
  <multiInstanceLoopCharacteristics isSequential="true">
    <loopCardinality>3</loopCardinality>
  </multiInstanceLoopCharacteristics>
</userTask>
```
