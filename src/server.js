exports.VERSION = "1.0.0";

const http = require("http");
const https = require("https");
const fs = require("fs");
const app = require("./app");
const router = require("./routes");

const matchesDisallowedStudentPaths = path => {
  return (
    path.match("/h5p/edit/.*") ||
    path.match("/h5p/delete/.*") ||
    path === "/adminstart" ||
    path === "/adminstart/" ||
    path === "/h5p/new" ||
    path === "/h5p/new/" ||
    path === "/h5p" ||
    path === "/h5p/" ||
    path === "/"
  );
};

// regular & lti routes
app.use("/", router.routes());
// api routes
app.use("/api/", router.apiroutes());

// Set user permissions for H5P
app.use((req, res, next) => {
  if (req.session.userId || process.env.NODE_ENV === "development") {
    console.log("req.session: ", req.session);
    let userName;
    if (req.session?.lis_person_name_full) {
      userName = req.session.lis_person_name_full;
    } else if (
      req.session?.lis_person_name_given &&
      !req.session?.lis_person_name_family
    ) {
      userName = req.session.lis_person_name_given;
    } else if (
      !req.session?.lis_person_name_given &&
      req.session?.lis_person_name_family
    ) {
      userName = req.session.lis_person_name_family;
    } else if (
      req.session?.lis_person_name_given &&
      req.session?.lis_person_name_family
    ) {
      userName =
        req.session.lis_person_name_given +
        " " +
        req.session.lis_person_name_family;
    } else {
      userName = "No name given";
    }

    req.user = {
      id:
        process.env.NODE_ENV === "development"
          ? "1"
          : String(req.session.userId),
      name: userName,
      canInstallRecommended:
        process.env.NODE_ENV === "development" ? true : req.session.isTutor,
      canUpdateAndInstallLibraries:
        process.env.NODE_ENV === "development" ? true : req.session.isTutor,
      canCreateRestricted:
        process.env.NODE_ENV === "development" ? true : req.session.isTutor,
      type: "internet",
      email: req.session?.lis_person_contact_email_primary
        ? req.session?.lis_person_contact_email_primary
        : "noone@ki-campus.org",
      isTutor:
        process.env.NODE_ENV === "development" ? true : req.session.isTutor,
    };

    // If they aren't a tutor but they are logged in,
    // just keep sending them back to the same exercise...
    if (
      req.session.exercise &&
      !req.session.isTutor &&
      matchesDisallowedStudentPaths(req.path)
    ) {
      return res.redirect(`/h5p/play/${req.session.exercise}`);
    }
  } else {
    return res.redirect("/application");
  }
  next();
});

if (process.env.NODE_ENV === "development") {
  // Start the app
  const port = process.env.PORT || 3003;
  app.listen(port, () => console.log(`App listening on port ${port}!`));
} else {
  const port = process.env.PORT || 443;
  const http_timeout = process.env.HTTP_TIMEOUT || 5 * 60 * 1000;
  const http_keepAliveTimeout =
    process.env.HTTP_KEEPALIVE_TIMEOUT || 5 * 60 * 1000;
  const http_headersTimeout = process.env.HTTP_HEADERS_TIMEOUT || 5 * 61 * 1000;

  let webServer;

  if (port !== 443) {
    // server runs behind a proxy, ssl termination is done by proxy
    webServer = http.createServer(app);
  } else {
    // Certificate
    const privateKey = fs.readFileSync(
      `/etc/letsencrypt/live/${process.env.DOMAIN}/privkey.pem`,
      "utf8"
    );
    const certificate = fs.readFileSync(
      `/etc/letsencrypt/live/${process.env.DOMAIN}/cert.pem`,
      "utf8"
    );
    const ca = fs.readFileSync(
      `/etc/letsencrypt/live/${process.env.DOMAIN}/chain.pem`,
      "utf8"
    );
    const credentials = {
      key: privateKey,
      cert: certificate,
      ca: ca,
    };
    webServer = https.createServer(credentials, app);
  }

  webServer.setTimeout(http_timeout);
  webServer.keepAliveTimeout = http_keepAliveTimeout;
  webServer.headersTimeout = http_headersTimeout;
  webServer.listen(port, () => {
    console.log(`HTTP Server running on port ${port}`);
  });
}
