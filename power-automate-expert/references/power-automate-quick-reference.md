# Power Automate Quick Reference Guide

**Version:** 1.0  
**Last Updated:** October 19, 2025  
**Purpose:** Fast lookup reference for functions, actions, and syntax during development

---

## Table of Contents

1. [Built-in Actions](#built-in-actions)
   - [Data Operations](#data-operations)
   - [Date & Time](#date--time-actions)
   - [Variables](#variable-actions)
   - [Control](#control-actions)
   - [Loops](#loop-actions)
2. [Expression Functions](#expression-functions)
   - [Collection Functions](#collection-functions)
   - [Conversion Functions](#conversion-functions)
   - [Date & Time Functions](#date--time-functions)
   - [JSON & XML Manipulation](#json--xml-manipulation-functions)
   - [Logical Functions](#logical-functions)
   - [Math Functions](#math-functions)
   - [String Functions](#string-functions)
   - [URI Parsing Functions](#uri-parsing-functions)
   - [Workflow Functions](#workflow-functions)
3. [Cross-References](#cross-references)

---

## Built-in Actions

Built-in actions in Power Automate cloud flows do not require external connectors. They are organized into categories: Data Operations, Date & Time, Variables, Control, and Loops.

### Data Operations

#### Compose

**Purpose:** Generate a single output from input data or expressions for reuse.

**Syntax:**
```
Inputs: <value or expression>
```

**Example:**
```
Inputs: createArray('d@example.com', 'k@example.com', 'dal@example.com')
Outputs: ['d@example.com', 'k@example.com', 'dal@example.com']
```

**Use Case:** Avoid typing the same data multiple times; store arrays, objects, or values for later reference in the flow.

**Performance Notes:** In-memory operation; no API call overhead.

---

#### Join

**Purpose:** Combine all items in an array into a single string separated by a delimiter.

**Syntax:**
```
From: <array>
Join with: <delimiter>
```

**Example:**
```
From: outputs('Compose')
Join with: ;
Result: "d@example.com;k@example.com;dal@example.com"
```

**Use Case:** Create delimited lists for email recipients, CSV generation, or concatenating values.

**Performance Notes:** Executes in a single operation; highly efficient for string building.

---

#### Select

**Purpose:** Transform the shape of each object in an array without changing the number of items.

**Syntax:**
```
From: <array>
Map: {
  "NewKey1": item()?['OldKey1'],
  "NewKey2": expression
}
```

**Example:**
```
Input: [{"first":"Eugenia","last":"Washington"},{"first":"Henry","last":"Jensen"}]
Map: {
  "FirstName": item()?['first'],
  "FamilyName": item()?['last'],
  "FullName": concat(item()?['first'], ' ', item()?['last'])
}
Output: [{"FirstName":"Eugenia","FamilyName":"Washington","FullName":"Eugenia Washington"},{...}]
```

**Use Case:** Rename properties, project specific fields, create calculated columns, prepare data for bulk operations.

**Performance Notes:** One of the fastest transformation operations; processes entire array declaratively. **Text Mode:** Switch to Text mode to output a simple array of primitive values (e.g., `item()?['Email']` → `["user1@example.com", "user2@example.com"]`).

---

#### Filter Array

**Purpose:** Filter an array to a subset that meets a condition. Case-sensitive for strings.

**Syntax:**
```
From: <array>
Condition: <property> <operator> <value>
```

**Advanced Mode:**
```
@and(equals(item()?['status'], 'Active'), startsWith(item()?['region'], 'North'))
```

**Example:**
```
Input: [{"first":"Eugenia","last":"Washington"},{"first":"Henry","last":"Jensen"}]
Condition: first is equal to "Eugenia"
Output: [{"first":"Eugenia","last":"Washington"}]
```

**Use Case:** Reduce dataset size before processing; implement conditional logic without loops.

**Performance Notes:** Executes in a single pass; far superior to looping with Condition actions.

---

#### Create CSV Table

**Purpose:** Convert a JSON array into CSV-formatted text.

**Syntax:**
```
From: <array>
Columns: Automatic or Custom
```

**Example:**
```
Input: [{"Product":"Widget","Quantity":5,"Price":10},{"Product":"Gadget","Quantity":2,"Price":15}]
Output: 
Product,Quantity,Price
Widget,5,10
Gadget,2,15
```

**Use Case:** Export data to CSV files, send tabular data via email, prepare data for Excel import.

**Performance Notes:** Single operation; efficient for dataset conversion.

---

#### Create HTML Table

**Purpose:** Create an HTML table from a JSON array.

**Syntax:**
```
From: <array>
Columns: Automatic or Custom
```

**Example:**
```
Input: [{"Product":"Widget","Quantity":5},{"Product":"Gadget","Quantity":2}]
Output: <table><tr><th>Product</th><th>Quantity</th></tr><tr><td>Widget</td><td>5</td></tr><tr><td>Gadget</td><td>2</td></tr></table>
```

**Use Case:** Embed formatted tables in HTML emails; set `IsHtml` to `Yes` in Send Email action.

**Performance Notes:** In-memory transformation; no external dependencies.

---

### Date & Time Actions

#### Convert Time Zone

**Purpose:** Convert a timestamp from one time zone to another with optional formatting.

**Syntax:**
```
Base time: <timestamp>
Source time zone: <timezone>
Destination time zone: <timezone>
Format string: <optional format>
```

**Example:**
```
Base time: 2018-01-01T08:00:00Z
Source: UTC
Destination: Pacific Standard Time
Format: 'D'
Output: "Monday, January 1, 2018"
```

**Use Case:** Localize timestamps for user time zones, format dates for display, handle global operations.

**Performance Notes:** Single operation; supports RFC 4646 locale codes.

---

### Variable Actions

#### Initialize Variable

**Purpose:** Declare a new variable and set its data type and initial value at the global flow level.

**Syntax:**
```
Name: <variable name>
Type: String | Boolean | Integer | Float | Array | Object
Value: <initial value>
```

**Example:**
```
Name: Count
Type: Integer
Value: 0
```

**Use Case:** Store counters, flags, accumulator arrays, or temporary state.

**Performance Notes:** Each variable requires its own Initialize action. Access with `variables('name')`.

---

#### Set Variable

**Purpose:** Assign a completely new value to an existing variable.

**Syntax:**
```
Name: <variable name>
Value: <new value (same type)>
```

**Example:**
```
Name: Status
Value: 'Complete'
```

**Use Case:** Update state during flow execution; replace values conditionally.

**Performance Notes:** **Warning:** Avoid using inside concurrent loops (causes variable locking). Use Compose instead for parallel operations.

---

#### Increment Variable

**Purpose:** Add a numeric value to an existing integer or float variable.

**Syntax:**
```
Name: <variable name>
Value: <increment amount> (default: 1)
```

**Example:**
```
Name: Count
Value: 1
```

**Use Case:** Counters, iteration tracking, accumulating totals.

**Performance Notes:** **Warning:** Cannot be used safely in concurrent loops (serializes execution).

---

#### Decrement Variable

**Purpose:** Subtract a numeric value from an integer or float variable.

**Syntax:**
```
Name: <variable name>
Value: <decrement amount> (default: 1)
```

**Example:**
```
Name: RemainingItems
Value: 1
```

**Use Case:** Countdown timers, inventory tracking, quota management.

**Performance Notes:** Same locking considerations as Increment Variable.

---

#### Append to String Variable

**Purpose:** Add a value to the end of an existing string variable.

**Syntax:**
```
Name: <variable name>
Value: <string to append>
```

**Example:**
```
Name: LogMessage
Value: '\nNew entry added'
```

**Use Case:** Build logs, concatenate messages, accumulate text.

**Performance Notes:** Sequential operation; avoid in high-volume scenarios.

---

#### Append to Array Variable

**Purpose:** Add a value to the end of an existing array variable.

**Syntax:**
```
Name: <variable name>
Value: <item to append>
```

**Example:**
```
Name: OrderList
Value: item()?['OrderID']
```

**Use Case:** Collect items during iteration, build dynamic lists, aggregate results.

**Performance Notes:** Array size limit: ~104 MB. For large datasets, use batching patterns.

---

### Control Actions

#### Condition

**Purpose:** Run different sets of actions depending on whether a condition is true or false.

**Syntax:**
```
Left value: <dynamic content or expression>
Operator: is equal to | is greater than | is less than | contains | etc.
Right value: <comparison value>
If yes: <actions>
If no: <actions>
```

**Example:**
```
Left: outputs('Get_tweets')?['body/RetweetCount']
Operator: is greater than or equal to
Right: 10
If yes: Send email notification
If no: (empty)
```

**Use Case:** Branching logic, approval workflows, conditional processing.

**Performance Notes:** Lightweight operation; can be nested for complex logic.

---

### Loop Actions

#### Apply to Each

**Purpose:** Loop over an array of items and perform one or more actions for each item.

**Syntax:**
```
Select an output from previous steps: <array>
Actions: <one or more actions to perform per item>
```

**Example:**
```
Input: outputs('Get_emails')?['body/value']
Actions: Condition (check subject), Send notification
```

**Use Case:** Process lists of records, handle batch operations, iterate over collections.

**Performance Notes:** 
- **Sequential (default):** Processes one item at a time; slow for large arrays.
- **Concurrent (enable in settings):** Up to 50 parallel threads; **critical constraint:** cannot use Set/Increment variable inside concurrent loops (causes locking).
- **Limit:** 5,000 items (Low/Standard), 100,000 items (Premium).
- **Best Practice:** Avoid loops when possible; use declarative functions (Select, Filter Array) instead.

---

## Expression Functions

Expression functions are used in Power Automate workflows to manipulate data, perform calculations, and control flow logic. Functions are organized by category.

### Collection Functions

#### chunk

**Category:** String, Collection  
**Usage:** `chunk('<collection>', '<length>')`  
**Example:** `chunk('abcdefghijklmnopqrstuvwxyz', 10)` → `["abcdefghij", "klmnopqrst", "uvwxyz"]`  
**Description:** Split a string or array into chunks of equal length.

---

#### contains

**Category:** Collection  
**Usage:** `contains('<collection>', '<value>')`  
**Example:** `contains('hello world', 'world')` → `true`  
**Description:** Check whether a collection has a specific item. Case-sensitive.

---

#### empty

**Category:** Collection  
**Usage:** `empty('<collection>')`  
**Example:** `empty('')` → `true`, `empty('abc')` → `false`  
**Description:** Check whether a collection is empty.

---

#### first

**Category:** Collection  
**Usage:** `first('<collection>')`  
**Example:** `first('hello')` → `"h"`, `first(createArray(0, 1, 2))` → `0`  
**Description:** Return the first item from a string or array.

---

#### intersection

**Category:** Collection  
**Usage:** `intersection([<collection1>], [<collection2>], ...)`  
**Example:** `intersection(createArray(1, 2, 3), createArray(101, 2, 1, 10))` → `[1, 2]`  
**Description:** Return a collection with only the common items across all specified collections.

---

#### item

**Category:** Collection, Workflow  
**Usage:** `item()`  
**Example:** `item().body` or `item()?['PropertyName']`  
**Description:** When used inside a repeating action (Apply to each), return the current item in the array during the current iteration.

---

#### join

**Category:** Collection  
**Usage:** `join([<collection>], '<delimiter>')`  
**Example:** `join(createArray('a', 'b', 'c'), '.')` → `"a.b.c"`  
**Description:** Return a string with all items from an array separated by a delimiter.

---

#### last

**Category:** Collection  
**Usage:** `last('<collection>')`  
**Example:** `last('abcd')` → `"d"`, `last(createArray(0, 1, 2, 3))` → `3`  
**Description:** Return the last item from a collection.

---

#### length

**Category:** String, Collection  
**Usage:** `length('<collection>')`  
**Example:** `length('abcd')` → `4`, `length(createArray(0, 1, 2, 3))` → `4`  
**Description:** Return the number of items in a collection.

---

#### reverse

**Category:** Collection  
**Usage:** `reverse([<collection>])`  
**Example:** `reverse(createArray(0, 1, 2, 3))` → `[3, 2, 1, 0]`  
**Description:** Reverse the order of items in a collection. Combine with `sort()` for descending order.

---

#### skip

**Category:** Collection  
**Usage:** `skip([<collection>], <count>)`  
**Example:** `skip(createArray(0, 1, 2, 3), 1)` → `[1, 2, 3]`  
**Description:** Remove items from the front of a collection and return all other items.

---

#### sort

**Category:** Collection  
**Usage:** `sort([<collection>], <sortBy>?)`  
**Example:** `sort(createArray(2, 1, 0, 3))` → `[0, 1, 2, 3]`  
**Description:** Sort items in a collection. Can sort collection objects using any key with simple type.

---

#### take

**Category:** Collection  
**Usage:** `take('<collection>', <count>)`  
**Example:** `take('abcde', 3)` → `"abc"`, `take(createArray(0, 1, 2, 3, 4), 3)` → `[0, 1, 2]`  
**Description:** Return items from the front of a collection.

---

#### union

**Category:** Collection  
**Usage:** `union('<collection1>', '<collection2>', ...)`  
**Example:** `union(createArray(1, 2, 3), createArray(1, 2, 10, 101))` → `[1, 2, 3, 10, 101]`  
**Description:** Return a collection with all items from specified collections. Removes duplicates.

---

### Conversion Functions

#### array

**Category:** Conversion  
**Usage:** `array('<value>')`  
**Example:** `array('hello')` → `["hello"]`  
**Description:** Return an array from a single specified input. For multiple inputs, use `createArray()`.

---

#### base64

**Category:** Conversion  
**Usage:** `base64('<value>')`  
**Example:** `base64('hello')` → `"aGVsbG8="`  
**Description:** Return the base64-encoded version for a string.

---

#### base64ToBinary

**Category:** Conversion  
**Usage:** `base64ToBinary('<value>')`  
**Example:** `base64ToBinary('aGVsbG8=')`  
**Description:** Return the binary version for a base64-encoded string.

---

#### base64ToString

**Category:** Conversion  
**Usage:** `base64ToString('<value>')`  
**Example:** `base64ToString('aGVsbG8=')` → `"hello"`  
**Description:** Return the string version for a base64-encoded string (decode). Preferred over `decodeBase64()`.

---

#### binary

**Category:** Conversion  
**Usage:** `binary('<value>')`  
**Description:** Return the base64-encoded binary version of a string.

---

#### bool

**Category:** Conversion  
**Usage:** `bool(<value>)`  
**Description:** Return the Boolean version of a value.

---

#### createArray

**Category:** Conversion  
**Usage:** `createArray('<object1>', '<object2>', ...)`  
**Example:** `createArray('h', 'e', 'l', 'l', 'o')` → `["h", "e", "l", "l", "o"]`  
**Description:** Return an array from multiple inputs.

---

#### dataUri

**Category:** Conversion  
**Usage:** `dataUri('<value>')`  
**Example:** `dataUri('hello')`  
**Description:** Return a data URI for a string.

---

#### dataUriToBinary

**Category:** Conversion  
**Usage:** `dataUriToBinary('<value>')`  
**Example:** `dataUriToBinary('data:text/plain;charset=utf-8;base64,aGVsbG8=')`  
**Description:** Return the binary version for a data URI. Preferred over `decodeDataUri()`.

---

#### dataUriToString

**Category:** Conversion  
**Usage:** `dataUriToString('<value>')`  
**Example:** `dataUriToString('data:text/plain;charset=utf-8;base64,aGVsbG8=')` → `"hello"`  
**Description:** Return the string version for a data URI.

---

#### decimal

**Category:** Conversion  
**Usage:** `decimal('<value>')`  
**Example:** `decimal('1.2345678912312131')` → `1.234567891231213`  
**Description:** Return a decimal number from a string. **Important:** Wrap with `string()` to preserve precision in outputs.

---

#### decodeUriComponent

**Category:** Conversion  
**Usage:** `decodeUriComponent('<value>')`  
**Example:** `decodeUriComponent('https%3A%2F%2Fcontoso.com')` → `"https://contoso.com"`  
**Description:** Return a string with escape characters replaced by decoded versions.

---

#### encodeUriComponent

**Category:** Conversion  
**Usage:** `encodeUriComponent('<value>')`  
**Example:** `encodeUriComponent('https://contoso.com')` → `"https%3A%2F%2Fcontoso.com"`  
**Description:** Return a URI-encoded version for a string. Prefer `uriComponent()`.

---

#### float

**Category:** Conversion  
**Usage:** `float('<value>', '<locale>'?)`  
**Example:** `float('10,000.333')` → `10000.333`  
**Description:** Convert a string to a floating-point number. Supports locale-specific formats (RFC 4646 codes).

---

#### int

**Category:** Conversion  
**Usage:** `int('<value>')`  
**Example:** `int('10')` → `10`  
**Description:** Convert the string version of an integer to an actual integer.

---

#### json

**Category:** Conversion  
**Usage:** `json('<value>')`  
**Example:** `json('[1, 2, 3]')` → `[1, 2, 3]`  
**Description:** Return the JSON type value, object, or array of objects for a string or XML.

---

#### string

**Category:** Conversion  
**Usage:** `string(<value>)`  
**Example:** `string(10)` → `"10"`  
**Description:** Return the string version for a value.

---

#### uriComponent

**Category:** Conversion  
**Usage:** `uriComponent('<value>')`  
**Example:** `uriComponent('https://contoso.com')` → `"https%3A%2F%2Fcontoso.com"`  
**Description:** Return a URI-encoded version for a string. Preferred over `encodeUriComponent()`.

---

#### uriComponentToBinary

**Category:** Conversion  
**Usage:** `uriComponentToBinary('<value>')`  
**Example:** `uriComponentToBinary('https%3A%2F%2Fcontoso.com')`  
**Description:** Return the binary version for a URI component.

---

#### uriComponentToString

**Category:** Conversion  
**Usage:** `uriComponentToString('<value>')`  
**Example:** `uriComponentToString('https%3A%2F%2Fcontoso.com')` → `"https://contoso.com"`  
**Description:** Return the string version for a URI-encoded string (decode).

---

#### xml

**Category:** Conversion  
**Usage:** `xml('<value>')`  
**Example:** `xml('<name>Sophia Owen</name>')`  
**Description:** Return the XML version for a string that contains a JSON object.

---

### Date & Time Functions

#### addDays

**Category:** Date & time  
**Usage:** `addDays('<timestamp>', <days>, '<format>'?)`  
**Example:** `addDays('2018-03-15T00:00:00Z', 10)` → `"2018-03-25T00:00:00.0000000Z"`  
**Description:** Add days to a timestamp.

---

#### addHours

**Category:** Date & time  
**Usage:** `addHours('<timestamp>', <hours>, '<format>'?)`  
**Example:** `addHours('2018-03-15T00:00:00Z', 10)` → `"2018-03-15T10:00:00.0000000Z"`  
**Description:** Add hours to a timestamp.

---

#### addMinutes

**Category:** Date & time  
**Usage:** `addMinutes('<timestamp>', <minutes>, '<format>'?)`  
**Example:** `addMinutes('2018-03-15T00:10:00Z', 10)` → `"2018-03-15T00:20:00.0000000Z"`  
**Description:** Add minutes to a timestamp.

---

#### addSeconds

**Category:** Date & time  
**Usage:** `addSeconds('<timestamp>', <seconds>, '<format>'?)`  
**Example:** `addSeconds('2018-03-15T00:00:00Z', 10)` → `"2018-03-15T00:00:10.0000000Z"`  
**Description:** Add seconds to a timestamp.

---

#### addToTime

**Category:** Date & time  
**Usage:** `addToTime('<timestamp>', <interval>, '<timeUnit>', '<format>'?)`  
**Example:** `addToTime('2018-01-01T00:00:00Z', 1, 'Day')` → `"2018-01-02T00:00:00.0000000Z"`  
**Description:** Add specified time units to a timestamp. See also `getFutureTime()`.

---

#### convertFromUtc

**Category:** Date & time  
**Usage:** `convertFromUtc('<timestamp>', '<destinationTimeZone>', '<format>'?)`  
**Example:** `convertFromUtc('2018-01-01T08:00:00.0000000Z', 'Pacific Standard Time')`  
**Description:** Convert a timestamp from UTC to the target time zone.

---

#### convertTimeZone

**Category:** Date & time  
**Usage:** `convertTimeZone('<timestamp>', '<sourceTimeZone>', '<destinationTimeZone>', '<format>'?)`  
**Example:** `convertTimeZone('2018-01-01T08:00:00.0000000Z', 'UTC', 'Pacific Standard Time')`  
**Description:** Convert a timestamp from source time zone to target time zone.

---

#### convertToUtc

**Category:** Date & time  
**Usage:** `convertToUtc('<timestamp>', '<sourceTimeZone>', '<format>'?)`  
**Example:** `convertToUtc('01/01/2018 00:00:00', 'Pacific Standard Time')`  
**Description:** Convert a timestamp from source time zone to UTC.

---

#### dateDifference

**Category:** Date & time  
**Usage:** `dateDifference('<startDate>', '<endDate>')`  
**Example:** `dateDifference('2015-02-08', '2018-07-30')`  
**Description:** Return the difference between two timestamps as a timespan. Subtracts startDate from endDate.

---

#### dayOfMonth

**Category:** Date & time  
**Usage:** `dayOfMonth('<timestamp>')`  
**Example:** `dayOfMonth('2018-03-15T13:27:36Z')` → `15`  
**Description:** Return the day of the month from a timestamp.

---

#### dayOfWeek

**Category:** Date & time  
**Usage:** `dayOfWeek('<timestamp>')`  
**Example:** `dayOfWeek('2018-03-15T13:27:36Z')` → `4` (Thursday)  
**Description:** Return the day of the week from a timestamp (0=Sunday, 6=Saturday).

---

#### dayOfYear

**Category:** Date & time  
**Usage:** `dayOfYear('<timestamp>')`  
**Example:** `dayOfYear('2018-03-15T13:27:36Z')` → `74`  
**Description:** Return the day of the year from a timestamp.

---

#### formatDateTime

**Category:** Date & time  
**Usage:** `formatDateTime('<timestamp>', '<format>'?, '<locale>'?)`  
**Examples:**
```
formatDateTime('03/15/2018') → '2018-03-15T00:00:00.0000000'
formatDateTime('03/15/2018 12:00:00', 'yyyy-MM-ddTHH:mm:ss') → '2018-03-15T12:00:00'
formatDateTime('01/31/2016', 'dddd MMMM d') → 'Sunday January 31'
formatDateTime('01/31/2016', 'dddd MMMM d', 'fr-fr') → 'dimanche janvier 31'
```  
**Description:** Return a timestamp in the specified format. Supports localization.

---

#### getFutureTime

**Category:** Date & time  
**Usage:** `getFutureTime(<interval>, <timeUnit>, <format>?)`  
**Example:** `getFutureTime(5, 'Day')` → timestamp 5 days from now  
**Description:** Return the current timestamp plus the specified time units.

---

#### getPastTime

**Category:** Date & time  
**Usage:** `getPastTime(<interval>, <timeUnit>, <format>?)`  
**Example:** `getPastTime(5, 'Day')` → timestamp 5 days ago  
**Description:** Return the current timestamp minus the specified time units.

---

#### parseDateTime

**Category:** Date & time  
**Usage:** `parseDateTime('<timestamp>', '<locale>'?, '<format>'?)`  
**Examples:**
```
parseDateTime('20/10/2014', 'fr-fr') → '2014-10-20T00:00:00.0000000'
parseDateTime('21052019', 'fr-fr', 'ddMMyyyy') → '2019-05-21T00:00:00.0000000'
parseDateTime('10/20/2014 15h', 'en-US', 'MM/dd/yyyy HH\h') → '2014-10-20T15:00:00.0000000'
```  
**Description:** Return the timestamp from a string that contains a timestamp.

---

#### startOfDay

**Category:** Date & time  
**Usage:** `startOfDay('<timestamp>', '<format>'?)`  
**Example:** `startOfDay('2018-03-15T13:30:30Z')` → `"2018-03-15T00:00:00.0000000Z"`  
**Description:** Return the start of the day for a timestamp.

---

#### startOfHour

**Category:** Date & time  
**Usage:** `startOfHour('<timestamp>', '<format>'?)`  
**Example:** `startOfHour('2018-03-15T13:30:30Z')` → `"2018-03-15T13:00:00.0000000Z"`  
**Description:** Return the start of the hour for a timestamp.

---

#### startOfMonth

**Category:** Date & time  
**Usage:** `startOfMonth('<timestamp>', '<format>'?)`  
**Example:** `startOfMonth('2018-03-15T13:30:30Z')` → `"2018-03-01T00:00:00.0000000Z"`  
**Description:** Return the start of the month for a timestamp.

---

#### subtractFromTime

**Category:** Date & time  
**Usage:** `subtractFromTime('<timestamp>', <interval>, '<timeUnit>', '<format>'?)`  
**Example:** `subtractFromTime('2018-01-02T00:00:00Z', 1, 'Day')` → `"2018-01-01T00:00:00.0000000Z"`  
**Description:** Subtract a number of time units from a timestamp. See also `getPastTime()`.

---

#### ticks

**Category:** Date & time  
**Usage:** `ticks('<timestamp>')`  
**Description:** Return the number of ticks (100-nanosecond intervals) since January 1, 0001 12:00:00 midnight up to the specified timestamp.

---

#### utcNow

**Category:** Date & time  
**Usage:** `utcNow('<format>'?)`  
**Example:** `utcNow()` → current UTC timestamp  
**Description:** Return the current timestamp in UTC.

---

### JSON & XML Manipulation Functions

#### addProperty

**Category:** JSON & XML Manipulation  
**Usage:** `addProperty(<object>, '<property>', <value>)`  
**Example:**
```
setProperty(<object>, '<parent-property>', 
  addProperty(<object>['<parent-property>'], '<child-property>', <value>))
```  
**Description:** Add a property and value to a JSON object. Returns updated object. Throws error if property already exists.

---

#### coalesce

**Category:** JSON & XML Manipulation  
**Usage:** `coalesce(<object_1>, <object_2>, ...)`  
**Examples:**
```
coalesce(null, true, false) → true
coalesce(null, 'hello', 'world') → 'hello'
coalesce(null, null, null) → null
```  
**Description:** Return the first non-null value from one or more parameters. Empty strings, empty arrays, and empty objects aren't null.

---

#### removeProperty

**Category:** JSON & XML Manipulation  
**Usage:** `removeProperty(<object>, '<property>')`  
**Example:** `removeProperty(<object>['<parent-property>'], '<child-property>')`  
**Description:** Remove a property from an object and return the updated object. Returns original object if property doesn't exist.

---

#### setProperty

**Category:** JSON & XML Manipulation  
**Usage:** `setProperty(<object>, '<property>', <value>)`  
**Example:**
```
setProperty(<object>, '<parent-property>', 
  setProperty(<object>['parentProperty'], '<child-property>', <value>))
```  
**Description:** Set the value for JSON object's property and return the updated object. To add a new property, use `addProperty()`.

---

#### xpath

**Category:** JSON & XML Manipulation  
**Usage:** `xpath('<xml>', '<xpath>')`  
**Example:**
```xml
xpath('<produce><item><name>Gala</name><type>apple</type><count>20</count></item></produce>', 
      '/produce/item[count > 10]')
```  
**Description:** Check XML for nodes or values that match an XPath expression and return matching nodes or values. XPath helps navigate XML document structure.

---

### Logical Functions

#### and

**Category:** Logical  
**Usage:** `and(<expression1>, <expression2>, ...)`  
**Examples:**
```
and(true, true) → true
and(false, true) → false
and(false, false) → false
```  
**Description:** Check whether all expressions are true. Return true when all expressions are true.

---

#### equals

**Category:** Logical  
**Usage:** `equals('<object1>', '<object2>')`  
**Examples:**
```
equals(true, 1) → true
equals('abc', 'abcd') → false
```  
**Description:** Check whether both values, expressions, or objects are equivalent.

---

#### greater

**Category:** Logical  
**Usage:** `greater(<value>, <compareTo>)`  
**Examples:**
```
greater(10, 5) → true
greater('apple', 'banana') → false
```  
**Description:** Check whether the first value is greater than the second value.

---

#### greaterOrEquals

**Category:** Logical  
**Usage:** `greaterOrEquals(<value>, <compareTo>)`  
**Examples:**
```
greaterOrEquals(5, 5) → true
greaterOrEquals('apple', 'banana') → false
```  
**Description:** Check whether the first value is greater than or equal to the second value.

---

#### if

**Category:** Logical  
**Usage:** `if(<expression>, <valueIfTrue>, <valueIfFalse>)`  
**Example:** `if(equals(1, 1), 'yes', 'no')` → `"yes"`  
**Description:** Check whether an expression is true or false and return a specified value. Parameters are evaluated left to right.

---

#### isFloat

**Category:** String, Logical  
**Usage:** `isFloat('<string>', '<locale>'?)`  
**Example:** `isFloat('10,000.00')` → `true`  
**Description:** Return a boolean indicating whether a string is a floating-point number. Supports locale-specific formats (RFC 4646).

---

#### isInt

**Category:** String, Logical  
**Usage:** `isInt('<string>')`  
**Example:** `isInt('10')` → `true`  
**Description:** Return a boolean indicating whether a string is an integer.

---

#### less

**Category:** Logical  
**Usage:** `less(<value>, <compareTo>)`  
**Examples:**
```
less(5, 10) → true
less('banana', 'apple') → false
```  
**Description:** Check whether the first value is less than the second value.

---

#### lessOrEquals

**Category:** Logical  
**Usage:** `lessOrEquals(<value>, <compareTo>)`  
**Examples:**
```
lessOrEquals(10, 10) → true
lessOrEquals('apply', 'apple') → false
```  
**Description:** Check whether the first value is less than or equal to the second value.

---

#### not

**Category:** Logical  
**Usage:** `not(<expression>)`  
**Examples:**
```
not(false) → true
not(true) → false
```  
**Description:** Check whether an expression is false. Return true when expression is false.

---

#### or

**Category:** Logical  
**Usage:** `or(<expression1>, <expression2>, ...)`  
**Examples:**
```
or(true, false) → true
or(false, false) → false
```  
**Description:** Check whether at least one expression is true. Return true when at least one expression is true.

---

### Math Functions

#### add

**Category:** Math  
**Usage:** `add(<summand_1>, <summand_2>)`  
**Example:** `add(1, 1.5)` → `2.5`  
**Description:** Return the result from adding two numbers.

---

#### div

**Category:** Math  
**Usage:** `div(<dividend>, <divisor>)`  
**Examples:**
```
div(10, 5) → 2
div(11, 5) → 2
```  
**Description:** Return the integer result from dividing two numbers. For remainder, see `mod()`.

---

#### max

**Category:** Math  
**Usage:** `max(<number1>, <number2>, ...)` or `max(createArray(...))`  
**Examples:**
```
max(1, 2, 3) → 3
max(createArray(1, 2, 3)) → 3
```  
**Description:** Return the highest value from a list or array (inclusive at both ends).

---

#### min

**Category:** Math  
**Usage:** `min(<number1>, <number2>, ...)` or `min(createArray(...))`  
**Examples:**
```
min(1, 2, 3) → 1
min(createArray(1, 2, 3)) → 1
```  
**Description:** Return the lowest value from a set of numbers or an array.

---

#### mod

**Category:** Math  
**Usage:** `mod(<dividend>, <divisor>)`  
**Example:** `mod(3, 2)` → `1`  
**Description:** Return the remainder from dividing two numbers. For integer result, see `div()`.

---

#### mul

**Category:** Math  
**Usage:** `mul(<multiplicand1>, <multiplicand2>)`  
**Examples:**
```
mul(1, 2) → 2
mul(1.5, 2) → 3
```  
**Description:** Return the product from multiplying two numbers.

---

#### rand

**Category:** Math  
**Usage:** `rand(<minValue>, <maxValue>)`  
**Example:** `rand(1, 5)` → random integer from 1 to 4 (inclusive start, exclusive end)  
**Description:** Return a random integer from a specified range.

---

#### range

**Category:** Math  
**Usage:** `range(<startIndex>, <count>)`  
**Example:** `range(1, 4)` → `[1, 2, 3, 4]`  
**Description:** Return an integer array that starts from a specified integer.

---

#### sub

**Category:** Math  
**Usage:** `sub(<minuend>, <subtrahend>)`  
**Example:** `sub(10.3, 0.3)` → `10`  
**Description:** Return the result from subtracting the second number from the first.

---

### String Functions

#### chunk

**Category:** String, Collection  
**Usage:** `chunk('<collection>', '<length>')`  
**Example:** `chunk('abcdefghijklmnopqrstuvwxyz', 10)` → `["abcdefghij", "klmnopqrst", "uvwxyz"]`  
**Description:** Split a string or array into chunks of equal length.

---

#### concat

**Category:** String  
**Usage:** `concat('<text1>', '<text2>', ...)`  
**Example:** `concat('Hello', 'World')` → `"HelloWorld"`  
**Description:** Combine two or more strings and return the combined string.

---

#### endsWith

**Category:** String  
**Usage:** `endsWith('<text>', '<searchText>')`  
**Example:** `endsWith('hello world', 'world')` → `true`  
**Description:** Check whether a string ends with a specific substring. Case-insensitive.

---

#### formatNumber

**Category:** String  
**Usage:** `formatNumber(<number>, <format>, <locale>?)`  
**Example:** `formatNumber(1234567890, '0,0.00', 'en-us')` → `"1,234,567,890.00"`  
**Description:** Return a number as a string based on the specified format.

---

#### guid

**Category:** String  
**Usage:** `guid()` or `guid('<format>')`  
**Example:** `guid()` → `"c2ecc88d-88c8-4096-912c-d6f2e2b138ce"`  
**Description:** Generate a globally unique identifier (GUID) as a string.

---

#### indexOf

**Category:** String  
**Usage:** `indexOf('<text>', '<searchText>')`  
**Example:** `indexOf('hello world', 'world')` → `6`  
**Description:** Return the starting position (index) for a substring. Case-insensitive. Indexes start at 0.

---

#### isFloat

**Category:** String, Logical  
**Usage:** `isFloat('<string>', '<locale>'?)`  
**Example:** `isFloat('10,000.00')` → `true`  
**Description:** Return a boolean indicating whether a string is a floating-point number.

---

#### isInt

**Category:** String, Logical  
**Usage:** `isInt('<string>')`  
**Example:** `isInt('10')` → `true`  
**Description:** Return a boolean indicating whether a string is an integer.

---

#### lastIndexOf

**Category:** String  
**Usage:** `lastIndexOf('<text>', '<searchText>')`  
**Example:** `lastIndexOf('hello world hello world', 'world')` → `18`  
**Description:** Return the starting position for the last occurrence of a substring. Case-insensitive.

---

#### length

**Category:** String, Collection  
**Usage:** `length('<collection>')`  
**Examples:**
```
length('abcd') → 4
length(createArray(0, 1, 2, 3)) → 4
```  
**Description:** Return the number of items in a collection.

---

#### nthIndexOf

**Category:** String  
**Usage:** `nthIndexOf('<text>', '<searchText>', <occurrence>)`  
**Examples:**
```
nthIndexOf('123456789123465789', '1', 1) → 0
nthIndexOf('123456789123465789', '1', 2) → 9
nthIndexOf('123456789123465789', '6', 4) → -1
```  
**Description:** Return the starting position where the nth occurrence of a substring appears. Returns -1 if not found.

---

#### replace

**Category:** String  
**Usage:** `replace('<text>', '<oldText>', '<newText>')`  
**Example:** `replace('the old string', 'old', 'new')` → `"the new string"`  
**Description:** Replace a substring with the specified string. Case-sensitive.

---

#### slice

**Category:** String  
**Usage:** `slice('<text>', <startIndex>, <endIndex>?)`  
**Examples:**
```
slice('Hello World', 2) → 'llo World'
slice('Hello World', 2, 5) → 'llo'
slice('Hello World', -2) → 'ld'
slice('Hello World', 3, -1) → 'lo Worl'
```  
**Description:** Return a substring by specifying starting and ending position. See also `substring()`.

---

#### split

**Category:** String  
**Usage:** `split('<text>', '<delimiter>')`  
**Example:** `split('a_b_c', '_')` → `["a", "b", "c"]`  
**Description:** Return an array containing substrings separated by commas based on the delimiter.

---

#### startsWith

**Category:** String  
**Usage:** `startsWith('<text>', '<searchText>')`  
**Example:** `startsWith('hello world', 'hello')` → `true`  
**Description:** Check whether a string starts with a specific substring. Case-insensitive.

---

#### substring

**Category:** String  
**Usage:** `substring('<text>', <startIndex>, <length>)`  
**Example:** `substring('hello world', 6, 5)` → `"world"`  
**Description:** Return characters from a string starting from the specified position. Indexes start at 0. See also `slice()`.

---

#### toLower

**Category:** String  
**Usage:** `toLower('<text>')`  
**Example:** `toLower('Hello World')` → `"hello world"`  
**Description:** Return a string in lowercase format.

---

#### toUpper

**Category:** String  
**Usage:** `toUpper('<text>')`  
**Example:** `toUpper('Hello World')` → `"HELLO WORLD"`  
**Description:** Return a string in uppercase format.

---

#### trim

**Category:** String  
**Usage:** `trim('<text>')`  
**Example:** `trim(' Hello World ')` → `"Hello World"`  
**Description:** Remove leading and trailing whitespace from a string.

---

### URI Parsing Functions

#### uriHost

**Category:** URI parsing  
**Usage:** `uriHost('<uri>')`  
**Example:** `uriHost('https://www.localhost.com:8080')` → `"www.localhost.com"`  
**Description:** Return the host value for a URI.

---

#### uriPath

**Category:** URI parsing  
**Usage:** `uriPath('<uri>')`  
**Example:** `uriPath('https://www.contoso.com/catalog/shownew.htm?date=today')` → `"/catalog/shownew.htm"`  
**Description:** Return the path value for a URI.

---

#### uriPathAndQuery

**Category:** URI parsing  
**Usage:** `uriPathAndQuery('<uri>')`  
**Example:** `uriPathAndQuery('https://www.contoso.com/catalog/shownew.htm?date=today')` → `"/catalog/shownew.htm?date=today"`  
**Description:** Return the path and query values for a URI.

---

#### uriPort

**Category:** URI parsing  
**Usage:** `uriPort('<uri>')`  
**Example:** `uriPort('https://www.localhost:8080')` → `8080`  
**Description:** Return the port value for a URI.

---

#### uriQuery

**Category:** URI parsing  
**Usage:** `uriQuery('<uri>')`  
**Example:** `uriQuery('https://www.contoso.com/catalog/shownew.htm?date=today')` → `"?date=today"`  
**Description:** Return the query value for a URI.

---

#### uriScheme

**Category:** URI parsing  
**Usage:** `uriScheme('<uri>')`  
**Example:** `uriScheme('https://www.contoso.com/catalog/shownew.htm?date=today')` → `"https"`  
**Description:** Return the scheme value for a URI.

---

### Workflow Functions

#### action

**Category:** Workflow  
**Usage:** `action()`  
**Example:** `action().outputs.body` or `action()?['outputs']`  
**Description:** Return the current action's output at runtime or values from other JSON name-value pairs. References the entire action object by default.

---

#### actions

**Category:** Workflow  
**Usage:** `actions('<actionName>')`  
**Example:** `actions('Get_user').outputs.body.status`  
**Description:** Return an action's output at runtime. References entire action object by default. Shorthand: `body()`. For current action, use `action()`.

---

#### body

**Category:** Workflow  
**Usage:** `body('<actionName>')`  
**Example:** `body('Get_user')`  
**Description:** Return an action's body output at runtime. Shorthand for `actions('<actionName>').outputs.body`.

---

#### formDataMultiValues

**Category:** Workflow  
**Usage:** `formDataMultiValues('<actionName>', '<key>')`  
**Example:** `formDataMultiValues('Send_an_email', 'Subject')`  
**Description:** Return an array with values that match a key name in an action's form-data or form-encoded output.

---

#### formDataValue

**Category:** Workflow  
**Usage:** `formDataValue('<actionName>', '<key>')`  
**Example:** `formDataValue('Send_an_email', 'Subject')`  
**Description:** Return a single value that matches a key name in an action's form-data or form-encoded output. Throws error if multiple matches found.

---

#### item

**Category:** Collection, Workflow  
**Usage:** `item()`  
**Example:** `item().body` or `item()?['PropertyName']`  
**Description:** Inside a repeating action over an array, return the current item during the action's current iteration.

---

#### items

**Category:** Workflow  
**Usage:** `items('<loopName>')`  
**Example:** `items('myForEachLoopName')`  
**Description:** Return the current item from each cycle in a for-each loop. Use inside the for-each loop.

---

#### iterationIndexes

**Category:** Workflow  
**Usage:** `iterationIndexes('<loopName>')`  
**Description:** Return the index value for the current iteration inside an Until loop. Can be used inside nested Until loops.

---

#### listCallbackUrl

**Category:** Workflow  
**Usage:** `listCallbackUrl()`  
**Description:** Return the "callback URL" that calls a trigger or action. Works only with HttpWebhook and ApiConnectionWebhook connector types.

---

#### multipartBody

**Category:** Workflow  
**Usage:** `multipartBody('<actionName>', <index>)`  
**Description:** Return the body for a specific part in an action's output that has multiple parts.

---

#### outputs

**Category:** Workflow  
**Usage:** `outputs('<actionName>')`  
**Example:** `outputs('Get_user')`  
**Description:** Return an action's outputs at runtime.

---

#### parameters

**Category:** Workflow  
**Usage:** `parameters('<parameterName>')`  
**Example:** `parameters('fullName')` where parameter is defined as `{"fullName": "Sophia Owen"}`  
**Description:** Return the value for a parameter described in your workflow definition.

---

#### result

**Category:** Workflow  
**Usage:** `result('<scopedActionName>')`  
**Description:** Return the results from the top-level actions in a specified scoped action (For_each, Until, or Scope). Returns an array with information from first-level actions in that scope.

---

#### trigger

**Category:** Workflow  
**Usage:** `trigger()`  
**Description:** Return a trigger's output at runtime. References entire trigger object by default. Shorthand versions: `triggerOutputs()` and `triggerBody()`.

---

#### triggerBody

**Category:** Workflow  
**Usage:** `triggerBody()`  
**Description:** Return a trigger's body output at runtime. Shorthand for `trigger().outputs.body`.

---

#### triggerFormDataMultiValues

**Category:** Workflow  
**Usage:** `triggerFormDataMultiValues('<key>')`  
**Example:** `triggerFormDataMultiValues('feedUrl')`  
**Description:** Return an array with values that match a key name in a trigger's form-data or form-encoded output.

---

#### triggerFormDataValue

**Category:** Workflow  
**Usage:** `triggerFormDataValue('<key>')`  
**Example:** `triggerFormDataValue('feedUrl')`  
**Description:** Return a single value that matches a key name in a trigger's form-data or form-encoded output. Throws error if multiple matches found.

---

#### triggerMultipartBody

**Category:** Workflow  
**Usage:** `triggerMultipartBody(<index>)`  
**Description:** Return the body for a specific part in a trigger's output that has multiple parts.

---

#### triggerOutputs

**Category:** Workflow  
**Usage:** `triggerOutputs()`  
**Description:** Return a trigger's output at runtime. Shorthand for `trigger().outputs`.

---

#### variables

**Category:** Workflow  
**Usage:** `variables('<variableName>')`  
**Example:** `variables('numItems')`  
**Description:** Return the value for a specified variable.

---

#### workflow

**Category:** Workflow  
**Usage:** `workflow().<property>`  
**Description:** Return all details about the workflow itself during runtime.

---

## Cross-References

### For Strategic Guidance and Optimization Patterns

Refer to **Power Automate Enterprise Best Practices & Patterns** for:
- When to use loops vs. declarative functions
- Performance benchmarking and ROI calculations
- Bulk operation patterns (Dataverse, SharePoint, SQL)
- Advanced optimization techniques (XPath-on-JSON, in-memory lookups)
- Error handling strategies
- Platform limits and governance
- Anti-patterns to avoid

### For Implementation Examples

See **Power Automate Enterprise Best Practices & Patterns** Document 2 for:
- Real-world before/after refactoring scenarios
- Decision flowcharts for choosing processing methods
- Audit checklists for identifying optimization opportunities
- Complete architectural patterns for high-throughput integrations

---

**End of Quick Reference Guide**

*This document is designed for fast lookup during active development. For strategic architectural decisions, optimization patterns, and best practices, consult the Power Automate Enterprise Best Practices & Patterns guide.*
