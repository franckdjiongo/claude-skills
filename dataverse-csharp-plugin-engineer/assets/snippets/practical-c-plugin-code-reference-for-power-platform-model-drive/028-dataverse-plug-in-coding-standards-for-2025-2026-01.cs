// compliant
#nullable enable
if (!context.InputParameters.Contains("Target"))
    throw new InvalidPluginExecutionException("Target parameter is missing.");

// non-compliant
var target = (Entity)context.InputParameters["Target"]; // throws KeyNotFoundException / InvalidCast at runtime
