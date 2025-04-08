/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
const logger = require("firebase-functions/logger");

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// --- Initialization ---
// Ensure admin is initialized ONLY ONCE per instance
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// --- Template Caching ---
// Cache the template in memory for efficiency after the first load
let profileHtmlTemplate = null;
const templatePath = path.join(__dirname, "profile.html"); // Assumes profile.html is in the functions root

/**
 * Reads and caches the profile HTML template.
 * @return {string|null} The template content or null on error.
 */
function getProfileTemplate() {
  // Return cached version if available
  if (profileHtmlTemplate) {
    logger.info("Using cached profile.html template.");
    return profileHtmlTemplate;
  }
  // Otherwise, read from file system
  try {
    logger.info(`Reading profile.html template from: ${templatePath}`);
    profileHtmlTemplate = fs.readFileSync(templatePath, "utf8");
    if (!profileHtmlTemplate) {
      logger.error("Template file is empty!");
      return null;
    }
    logger.info("Successfully read and cached profile.html template.");
    return profileHtmlTemplate;
  } catch (error) {
    logger.error(`Critical error reading profile.html template: ${error.message}`, {errorDetails: error});
    // Clear cache variable on error so it might retry loading next time
    profileHtmlTemplate = null;
    return null; // Indicates failure to load
  }
}

// --- Cloud Function: Serve Profile Page (Server-Side Rendered) ---

exports.serveProfilePage = onRequest(
  {
    region: "us-central1", // Optional: Specify region
    // memory: "256MiB", // Optional: Adjust memory
    // timeoutSeconds: 60, // Optional: Adjust timeout
  },
  async (req, res) => {
    logger.info(`serveProfilePage triggered. Method: ${req.method}, Path: ${req.path}`);

    // Only handle GET requests
    if (req.method !== "GET") {
      logger.warn(`Unsupported method: ${req.method}`);
      res.status(405).send("Method Not Allowed");
      return;
    }

    // 1. Parse User ID from URL path
    const pathParts = req.path.split("/").filter((part) => part !== "");

    if (pathParts.length < 2 || pathParts[0] !== "profile") {
      logger.warn(`Invalid path format received: ${req.path}`);
      res.status(404).send("Page not found (Invalid Path Format).");
      return;
    }

    const userId = pathParts[1]; // Expecting the User ID
    logger.info(`Attempting to serve profile for User ID: ${userId}`);

    try {
      // 2. Fetch User Data from Firestore using User ID
      const userDocRef = db.collection("users").doc(userId);
      const userDoc = await userDocRef.get();

      if (!userDoc.exists) {
        logger.warn(`User document not found for ID: ${userId}`);
        res.status(404).send(`
                    <html><head><title>User Not Found</title></head>
                    <body><h1>User Not Found</h1><p>The requested user profile does not exist.</p>
                    <a href="/">Go Home</a></body></html>
                `);
        return;
      }

      const userData = userDoc.data();

      // 3. Prepare data for template (with defaults)
      const profileData = {
        USERNAME: userData.username || "Sway User",
        PROFILE_IMAGE: userData.profileImageUrl || "/images/default-profile.png",
        OG_URL: `https://swaysong.com${req.path}`,
        SONGS_COUNT: userData.totalPosts || 0,
        FOLLOWERS_COUNT: userData.followersCount || 0,
      };
      logger.info(`Successfully fetched data for User: ${profileData.USERNAME}`);

      // 4. Get HTML Template Content (using cached function)
      let htmlContent = getProfileTemplate();
      if (!htmlContent) {
        // Error logged within getProfileTemplate
        res.status(500).send("Internal Server Error: Could not load page template.");
        return;
      }

      // 5. Replace Placeholders in Template
      htmlContent = htmlContent.replace(/\{\{USERNAME\}\}/g, escapeHtml(profileData.USERNAME));
      htmlContent = htmlContent.replace(/\{\{PROFILE_IMAGE\}\}/g, escapeHtml(profileData.PROFILE_IMAGE));
      htmlContent = htmlContent.replace(/\{\{OG_URL\}\}/g, escapeHtml(profileData.OG_URL));
      htmlContent = htmlContent.replace(/\{\{SONGS_COUNT\}\}/g, profileData.SONGS_COUNT.toString());
      htmlContent = htmlContent.replace(/\{\{FOLLOWERS_COUNT\}\}/g, profileData.FOLLOWERS_COUNT.toString());

      // Replace placeholders within the visible part of the body too
      htmlContent = htmlContent.replace(
        /<h1 id="username-display" class="username">.*?<\/h1>/,
        `<h1 id="username-display" class="username">${escapeHtml(profileData.USERNAME)}</h1>`,
      );
      htmlContent = htmlContent.replace(
        /<img id="profile-image".*?>/,
        `<img id="profile-image" src="${escapeHtml(profileData.PROFILE_IMAGE)}" alt="${escapeHtml(profileData.USERNAME)}'s Profile Picture" class="profile-image">`,
      );
      htmlContent = htmlContent.replace(
        /<div id="songs-count" class="stat-value">.*?<\/div>/,
        `<div id="songs-count" class="stat-value">${profileData.SONGS_COUNT.toString()}</div>`,
      );
      htmlContent = htmlContent.replace(
        /<div id="followers-count" class="stat-value">.*?<\/div>/,
        `<div id="followers-count" class="stat-value">${profileData.FOLLOWERS_COUNT.toString()}</div>`,
      );

      // 6. Send Rendered HTML Response
      res.set("Content-Type", "text/html");
      res.set("Cache-Control", "public, max-age=60, s-maxage=300"); // Optional: Caching
      res.status(200).send(htmlContent);
      logger.info(`Successfully served profile page for User ID: ${userId}`);
    } catch (error) {
      logger.error(`Critical error serving profile page for User ID ${userId}: ${error.message}`, {errorDetails: error});
      res.status(500).send("Internal Server Error.");
    }
  },
);

/**
 * Escapes HTML special characters in a string.
 * @param {string} unsafe The potentially unsafe string.
 * @return {string} The escaped string.
 */
function escapeHtml(unsafe) {
  if (typeof unsafe !== "string") {
    unsafe = String(unsafe || "");
  }
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// --- NO OTHER FUNCTIONS FROM THE APP BACKEND ARE INCLUDED HERE ---
