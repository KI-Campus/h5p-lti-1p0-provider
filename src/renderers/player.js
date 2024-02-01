const session = require("express-session");

exports.model = session => model =>
  `<!doctype html>
<html class="h5p-iframe">
<head>
    <meta charset="utf-8">
    ${model.styles
      .map(style => `<link rel="stylesheet" href="${style}"/>`)
      .join("\n    ")}
    ${model.scripts
      .map(script => `<script src="${script}"></script>`)
      .join("\n    ")}
    <script>
        H5PIntegration = ${JSON.stringify(model.integration, null, 2)};
    </script>
    <title>${
      session.resource_link_title || session.context_title || "H5P Exercise"
    }</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    ${model.customScripts ? model.customScripts : ""}
    ${
      session.custom_style_url
        ? `<link rel="stylesheet" href="${session.custom_style_url}" />`
        : ""
    }
</head>
<body>
    <div class="kiron-h5p-container" style="max-width:900px; margin:0 auto; padding:0px 0px; position:relative;">
      <div class="h5p-content" data-content-id="${model.contentId}"></div>
      ${
        session.custom_message
          ? `<div class='h5p-confirmation-dialog-body' style='margin:20px auto;'>${session.custom_message}</div>`
          : ""
      }
    
      ${
        session.isTutor
          ? `<div class='h5p-confirmation-dialog-body' style='margin:20px auto;'>
          <p>You are seeing this message because you are logged in as an instructor</p>
          
    <p>To embed insert this into your
          ${
            session.custom_consumer
          } course, edit the "Additional parameters for this exercise" to contain this:</p>
          <code>exercise=${model.contentId}</code>
    
          <p>
            <a class="btn btn-secondary" title="Edit exercise" type="button" href="/h5p/edit/${
              model.contentId
            }" style="margin:0px;" target="_blank">Edit exercise</a>
          </p>
          <p>
            <a class="btn btn-secondary" title="List all exercises in this course" type="button" href="/h5p" style="margin:0px;" target="_blank">List all exercises</a>
          </p>
       
          ${
            session.LRS_CREATE_USER_ENABLE
              ? `<p>
              <div id="createUserDiv">
              <a onclick="requestCreateTempUser('${session.custom_consumer}','${session.context_id}')" class="btn btn-secondary" title="Generate LRS Login" type="button" href="#" style="margin:0px;">Generate LRS Login</a>
              </div>
          </p>`
              : ""
          }

          </div><br><div style="display:none">Consumer: ${
            session.custom_consumer
          }</div>`
          : ""
      }

      ${
        session.download_button_enabled
          ? `<a class="" href="/h5p/download/${model.contentId}"download><h6>Download</h6></a>`
          : ""
      }
      
    </div>
   
</body>
</html>`;
