/**
 * Downloads a current list of content types from the H5P Hub. This list is stored in the repository for mocking up the real hub without calling it
 * too often. Run this script to update the content type cache mockup. Expect necessary changes in the tests if the hub content changes.
 */

fsExtra = require("fs-extra");
path = require("path");
const H5P = require("h5p-nodejs-library");
const { ContentTypeCache } = require("../utils/content-type-cache-class");

const start = async () => {
  const keyValueStorage = new H5P.fsImplementations.InMemoryStorage();
  const config = new H5P.H5PConfig(keyValueStorage);
  config.uuid = "8de62c47-f335-42f6-909d-2d8f4b7fb7f5";

  const contentTypeCache = new ContentTypeCache(config, keyValueStorage);
  if (!(await contentTypeCache.forceUpdate())) {
    console.error("Could not download content type cache from H5P Hub.");
    return;
  }

  const contentTypes = await contentTypeCache.downloadContentTypesFromHub();
  await fsExtra.writeJSON(
    path.resolve("h5p/real-content-types.json"),
    { contentTypes }
  );
  console.log(
    "Wrote current content type cache to h5p/real-content-types.json"
  );
};

start();
