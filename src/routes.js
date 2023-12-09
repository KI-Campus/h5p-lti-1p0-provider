const axios = require("axios");
const express = require("express");
const { ltiProvider, ltiApi } = require("./lti");
const player = require("./renderers/player");
const editor = require("./renderers/editor");

const expressSession = require("express-session");

const { MongoClient } = require("mongodb");

var mongoClient = new MongoClient(
  process.env.MONGO_COMPLETE_URL || "mongodb://127.0.0.1:27017/h5p",
  { useUnifiedTopology: true }
);

// Async function to connect to MongoDB and initiaize variables for db and collection
async function connectMongo() {
  try {
    await mongoClient.connect();
    console.log("Native MongoDB Driver connected");
  } catch (err) {
    console.log("Error connecting to Mongo Server: ", err);
  }
}
connectMongo();

exports.routes = () => {
  let sessionData = {};

  const router = express.Router();

  // Basic up page
  router.get("/", async (req, res) => {
    return res.json({ status: "Up" });
  });

  // Application page that shows the shizz
  router.get("/application", async (req, res) => {
    if (req.session.userId) {
      sessionData = {
        email: req.session.email,
        username: req.session.username,
        ltiConsumer: req.session.ltiConsumer,
        userId: req.session.userId,
        isTutor: req.session.isTutor,
        context_id: req.session.context_id,
      };
      return res.render("index", sessionData);
    } else {
      const error =
        "Session invalid. Please login via LTI to use this application.";
      console.log(error);
      console.log("session data: ", req.session);
      res.status(403).send(error);
      return;
    }
  });

  // Admin start page that shows a link to launch in a new window
  router.get("/adminstart", async (req, res) => {
    res.send(
      "<p style='text-align:center;'><a href='/h5p/new' target='_blank'>Open editor in new window</a></p>"
    );
  });

  // Route for launching LTI authentication and creating the provider instance
  router.post("/launch_lti", ltiProvider.launch);
  return router;
};

exports.h5pRoutes = (h5pEditor, h5pPlayer, languageOverride) => {
  const router = express.Router();

  router.get(`${h5pEditor.config.playUrl}/:contentId`, async (req, res) => {
    try {
      const h5pPage = await h5pPlayer
        .setRenderer(player.model(req.session))
        .render(req.params.contentId, req.user);
      res.send(h5pPage);
      res.status(200).end();
    } catch (error) {
      res.status(500).end(error.message);
      console.log(error);
    }
  });

  router.get("/edit/:contentId", async (req, res) => {
    const metadata = await h5pEditor.contentManager.getContentMetadata(
      req.params.contentId,
      req.user
    );
    if (metadata.lti_context_id !== req.session.context_id) {
      res.send(
        `Sorry! You don't have permission to edit this content<br/><a href="javascript:window.location=document.referrer">Go Back</a>`
      );
      res.status(500).end();
      return;
    }
    const page = await h5pEditor
      .setRenderer(editor.model)
      .render(
        req.params.contentId,
        languageOverride === "auto" ? req.language ?? "en" : languageOverride,
        req.user
      );
    res.send(page);
    res.status(200).end();
  });

  router.post("/edit/:contentId", async (req, res) => {
    // add a unique identifier for the course to the h5p.json
    const metadata = req.body.params.metadata;
    if (req.session.context_id) {
      metadata.lti_context_id = req.session.context_id;
    }
    try {
      const contentId = await h5pEditor.saveOrUpdateContent(
        req.params.contentId.toString(),
        req.body.params.params,
        metadata,
        req.body.library,
        req.user
      );
      res.send(JSON.stringify({ contentId }));
      res.status(200).end();
    } catch (error) {
      console.log("Error in route /edit ", error);
      res.status(400).send("Malformed request").end();
    }
  });

  router.get("/new", async (req, res) => {
    const page = await h5pEditor
      .setRenderer(editor.model)
      .render(
        undefined,
        languageOverride === "auto" ? req.language ?? "en" : languageOverride,
        req.user
      );
    res.send(page);
    res.status(200).end();
  });

  router.post("/new", async (req, res) => {
    if (
      !req.body.params ||
      !req.body.params.params ||
      !req.body.params.metadata ||
      !req.body.library ||
      !req.user
    ) {
      res.status(400).send("Malformed request").end();
      return;
    }

    // add a unique identifier for the course to the h5p.json
    const metadata = req.body.params.metadata;
    if (req.session.context_id) {
      metadata.lti_context_id = req.session.context_id;
    }
    try {
      const contentId = await h5pEditor.saveOrUpdateContent(
        undefined,
        req.body.params.params,
        metadata,
        req.body.library,
        req.user
      );

      res.send(JSON.stringify({ contentId }));
      res.status(200).end();
    } catch (error) {
      console.log("Error in route /new ", error);
      res.status(400).send("Malformed request").end();
    }
  });

  router.get("/delete/:contentId", async (req, res) => {
    try {
      const metadata = await h5pEditor.contentManager.getContentMetadata(
        req.params.contentId,
        req.user
      );
      if (metadata.lti_context_id !== req.session.context_id) {
        res.send(
          `Sorry! You don't have permission to delete this content<br/><a href="javascript:window.location=document.referrer">Go Back</a>`
        );
        res.status(500).end();
        return;
      }
      await h5pEditor.deleteContent(req.params.contentId, req.user);
    } catch (error) {
      res.send(
        `Error deleting content with id ${req.params.contentId}: ${error.message}<br/><a href="javascript:window.location=document.referrer">Go Back</a>`
      );
      console.log("Error in route /delete ", error);
      res.status(500).end();
      return;
    }

    res.send(
      `Content ${req.params.contentId} successfully deleted.<br/><a href="javascript:window.location=document.referrer">Go Back</a>`
    );
    res.status(200).end();
  });

  // Feed xAPI to LRS System
  router.post("/send_to_lrs", async (req, res) => {
    // If LRS is enabled in environment variables then send it
    if (process.env.LRS_ENABLE == 1) {
      // Create a asyn function for axios
      const sendPostRequest = async () => {
        try {
          // Encrypt personal information before sending it to LRS
          /* Following personal data will be encrypted if found to have personal info in it
            req.session.email,
            req.session.username,
            req.session.userId,

            req.body.data.statement.actor.mbox,
            req.body.data.statement.actor.name,       
          */

          let encryptedSession = { ...req.session };

          // Check if session has email info, then remove it
          if (encryptedSession.email) {
            encryptedSession.email = ""
          }

          if (req.body.data.statement.actor.mbox) {
            req.body.data.statement.actor.mbox = ""
          }

          /*
          // Disabling Encryption for now
             if (encryptedSession.email) { encryptedSession.email = require("crypto").createHash("sha256").update(encryptedSession.email).digest("hex") }
             if (encryptedSession.username) { encryptedSession.username = require("crypto").createHash("sha256").update(encryptedSession.username).digest("hex") }
             if (encryptedSession.userId) { encryptedSession.userId = require("crypto").createHash("sha256").update(encryptedSession.userId).digest("hex") }
           */

          const resp = await axios.post(process.env.LRS_URL, {
            xAPI: req.body.data.statement,
            metadata: {
              session: encryptedSession,
              session_extra: expressSession,
              createdAt: new Date(),
            },
          });
          console.log("Sent to LRS ", {
            xAPI: req.body.data.statement,
            metadata: {
              session: encryptedSession,
              session_extra: expressSession,
              createdAt: new Date(),
              reqUser: req.user,
            },
          });
          res
            .status(200)
            .send(JSON.stringify({ result: "sent to LRS" }))
            .end();
        } catch (err) {
          // Handle Error Here
          res.status(500).end();
          console.error("Error sending to LRS: ", err);
        }
      };
      sendPostRequest();
    } else {
      // Send status 200 even if the LRS is not enabled so that the browser doesn't show request timeouts
      res.status(200).end();
    }
  });

  // Fetch configuration from MongoDB. This will be used to get all the exercises that need to be hidden in the editor
  router.get("/getconfig", async (req, res) => {
    mongoClient
      .db()
      .collection("config")
      .findOne({}, (err, result) => {
        if (!err) {
          res
            .status(200)
            .send(
              JSON.stringify({ success: true, result: JSON.stringify(result) })
            )
            .end();
        } else {
          console.log("Error in route /getconfig ", err);
          res.status(500).end();
        }
      });
  });

  return router;
};

// everything under /api/* goes here
exports.apiroutes = () => {
  const router = express.Router();
  // api route for sending outcomes back to LTI Consumer
  router.get("/outcome", ltiApi.sendOutcome);
  return router;
};
