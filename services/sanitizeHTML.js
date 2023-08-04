const sanitizeHtml = require("sanitize-html");

function sanitizeHTML(htmlDescription) {
  return sanitizeHtml(htmlDescription, {
    allowedTags: [], // Allow no tags, removing all tags
    allowedAttributes: {}, // Allow no attributes
  });
}

module.exports = {
  sanitizeHTML,
};
