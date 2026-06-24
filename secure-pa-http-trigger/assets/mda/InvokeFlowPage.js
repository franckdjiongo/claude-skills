// MDA ribbon command — Recommended path (7.3a).
// Opens a Custom Page dialog. The custom page invokes the protected flow
// via a custom connector binding (delegated user token, connector-managed).
// Authentication stays out of ribbon JavaScript.
//
// Web resource name suggestion: cont_/InvokeFlowPage.js
// Bind the command's "Run JavaScript" action to:
//   Library:  cont_/InvokeFlowPage.js
//   Function: Contoso.Ribbon.invokeFlow
//   Param:    PrimaryControl

"use strict";

var Contoso = Contoso || {};
Contoso.Ribbon = Contoso.Ribbon || {};

Contoso.Ribbon.invokeFlow = function (primaryControl) {
  var formContext = primaryControl;
  var recordId = formContext.data.entity.getId().replace(/[{}]/g, "");

  var pageInput = {
    pageType: "custom",
    name: "tp_callflow_b1f2c", // logical name of your custom page
    entityName: formContext.data.entity.getEntityName(),
    recordId: recordId,
  };

  var navigationOptions = {
    target: 2, // dialog
    position: 1, // center
    height: { value: 320, unit: "px" },
    width: { value: 480, unit: "px" },
    title: "Run server-side process",
  };

  Xrm.Navigation.navigateTo(pageInput, navigationOptions).then(
    function () {
      formContext.data.refresh(false);
    },
    function (err) {
      Xrm.Navigation.openErrorDialog({ message: err.message });
    },
  );
};

// ---
// Hardened variant with correlation ID and graceful global notification.
// Function: Contoso.Commanding.openSecureFlowDialog
// ---

var ContosoCommanding = Contoso.Commanding || {};
Contoso.Commanding = ContosoCommanding;

Contoso.Commanding.openSecureFlowDialog = async function (primaryControl) {
  var correlationId =
    window.crypto && window.crypto.randomUUID
      ? window.crypto.randomUUID()
      : Date.now().toString() + "-" + Math.random().toString(16).slice(2);

  try {
    var formContext = primaryControl;
    var recordId = formContext.data.entity.getId().replace(/[{}]/g, "");
    var entityName = formContext.data.entity.getEntityName();

    var pageInput = {
      pageType: "custom",
      name: "contoso_secureflowdialog",
      entityName: entityName,
      recordId: recordId,
    };

    var navigationOptions = {
      target: 2,
      position: 1,
      width: { value: 50, unit: "%" },
      title: "Run secured operation",
    };

    console.log("Opening secure dialog", {
      correlationId: correlationId,
      recordId: recordId,
      entityName: entityName,
    });

    await Xrm.Navigation.navigateTo(pageInput, navigationOptions);
  } catch (error) {
    var message =
      "Unable to open the secure operation dialog. CorrelationId=" +
      correlationId +
      ". " +
      (error && error.message ? error.message : error);

    Xrm.App.addGlobalNotification({
      type: 2, // message bar
      level: 2, // error
      message: message,
      showCloseButton: true,
    }).catch(function () {
      /* ignore notification failures */
    });

    console.error(message, error);
    throw error;
  }
};

// Custom Page button formula (Power Fx):
//   Set(_resp,
//       YourConnector.TriggerFlow({
//           accountId: Param("recordId"),
//           source: "mda-button",
//           correlationId: GUID()
//       })
//   );
//   Notify("Flow started: " & _resp.runId, NotificationType.Success);
//   Back();
